import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Field, NativeSelect, Loading, errMsg } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useBatches, usePeopleByRole } from "@/lib/data";
import { logAudit, useCurrentUser } from "@/lib/auth";
import { hhmm } from "@/lib/status";
import type { Database } from "@/integrations/supabase/types";

type FF = Database["public"]["Tables"]["form_fields"]["Row"];
type Val = string | string[] | boolean;

export const Route = createFileRoute("/_authenticated/fill/$formId")({
  validateSearch: (s: Record<string, unknown>): { classId?: string } =>
    typeof s["classId"] === "string" ? { classId: s["classId"] } : {},
  head: () => ({ meta: [{ title: "Fill form — University Manager" }, { name: "description", content: "Complete and submit a form." }] }),
  component: FillPage,
});

function FillPage() {
  const { formId } = Route.useParams();
  const { classId } = Route.useSearch();
  const nav = useNavigate();
  const { userId, primaryRole } = useCurrentUser();
  const batches = useBatches();
  const faculty = usePeopleByRole("faculty");
  const hods = usePeopleByRole("hod");
  const [vals, setVals] = useState<Record<string, Val>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [batchId, setBatchId] = useState("");
  const [studentId, setStudentId] = useState("");

  const form = useQuery({
    queryKey: ["form", formId],
    queryFn: async () => {
      const { data, error } = await supabase.from("forms").select("*, form_fields(*)").eq("id", formId).single();
      if (error) throw error;
      return { ...data, form_fields: data.form_fields.sort((a, b) => a.sort_order - b.sort_order) };
    },
  });
  const cls = useQuery({
    queryKey: ["class", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data } = await supabase.from("class_timings").select("*, batches(code)").eq("id", classId!).maybeSingle();
      return data;
    },
  });
  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, full_name, roll_no, batch_id, profile_id").order("roll_no");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (cls.data) setBatchId(cls.data.batch_id);
  }, [cls.data]);
  useEffect(() => {
    const me = students.data?.find((s) => s.profile_id === userId);
    if (me && primaryRole === "student") { setStudentId(me.id); if (me.batch_id) setBatchId(me.batch_id); }
  }, [students.data, userId, primaryRole]);
  useEffect(() => {
    if (!form.data) return;
    const init: Record<string, Val> = {};
    for (const f of form.data.form_fields) init[f.field_key] = f.field_type === "checkbox" ? f.default_value === "true" : f.field_type === "multiselect" ? [] : (f.default_value ?? "");
    setVals(init);
  }, [form.data]);

  function validate(fields: FF[]) {
    for (const f of fields) {
      const v = vals[f.field_key];
      const isFile = f.field_type === "file" || f.field_type === "image";
      const empty = isFile ? !files[f.field_key] : Array.isArray(v) ? !v.length : f.field_type === "checkbox" ? !v : !String(v ?? "").trim();
      if (f.is_required && empty) return `${f.label} is required`;
      if (typeof v === "string" && v) {
        if (f.min_length && v.length < f.min_length) return `${f.label} must be at least ${f.min_length} characters`;
        if (f.max_length && v.length > f.max_length) return `${f.label} must be at most ${f.max_length} characters`;
        if (f.field_type === "email" && !/^\S+@\S+\.\S+$/.test(v)) return `${f.label} must be a valid email`;
        if (f.field_type === "phone" && !/^[+\d][\d\s-]{6,}$/.test(v)) return `${f.label} must be a valid phone number`;
      }
    }
    return null;
  }

  const submit = useMutation({
    mutationFn: async (asDraft: boolean) => {
      const fm = form.data!;
      if (!asDraft) { const err = validate(fm.form_fields); if (err) throw new Error(err); }
      const data: Record<string, unknown> = { ...vals };
      for (const [k, file] of Object.entries(files)) data[k] = file.name;
      const { data: sub, error } = await supabase.from("form_submissions").insert({
        form_id: fm.id, submitted_by: userId!, status: asDraft ? "draft" : "submitted", data: data as never,
        batch_id: batchId || null, class_timing_id: classId ?? null, student_id: studentId || null,
      }).select("id, reference_no").single();
      if (error) throw error;
      for (const [, file] of Object.entries(files)) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB`);
        const path = `${userId}/${sub.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from("documents").upload(path, file);
        if (up.error) throw up.error;
        const { error: de } = await supabase.from("documents").insert({ submission_id: sub.id, uploaded_by: userId!, file_name: file.name, file_size: file.size, file_type: file.type, storage_path: path });
        if (de) throw de;
      }
      await logAudit({ userId, role: primaryRole, action: asDraft ? "save draft" : "submit form", module: "submissions", recordId: sub.reference_no });
      return sub;
    },
    onSuccess: (sub, asDraft) => { toast.success(asDraft ? "Draft saved" : `Submitted — ${sub.reference_no}`); nav({ to: "/submissions/$id", params: { id: sub.id } }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (form.isLoading) return <Loading />;
  if (!form.data) return <PageHeader title="Form not found" />;
  const fm = form.data;
  const set = (k: string, v: Val) => setVals((p) => ({ ...p, [k]: v }));

  function render(f: FF) {
    const v = vals[f.field_key];
    const s = typeof v === "string" ? v : "";
    const ph = f.placeholder ?? undefined;
    switch (f.field_type) {
      case "textarea": return <Textarea value={s} placeholder={ph} onChange={(e) => set(f.field_key, e.target.value)} />;
      case "number": case "email": case "date": case "time":
        return <Input type={f.field_type} value={s} placeholder={ph} onChange={(e) => set(f.field_key, e.target.value)} />;
      case "phone": return <Input type="tel" value={s} placeholder={ph} onChange={(e) => set(f.field_key, e.target.value)} />;
      case "datetime": return <Input type="datetime-local" value={s} onChange={(e) => set(f.field_key, e.target.value)} />;
      case "select": return <NativeSelect className="w-full" value={s} onChange={(x) => set(f.field_key, x)}><option value="">Select…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</NativeSelect>;
      case "radio": return <div className="flex flex-wrap gap-4">{f.options?.map((o) => <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" checked={s === o} onChange={() => set(f.field_key, o)} />{o}</label>)}</div>;
      case "multiselect": { const arr = Array.isArray(v) ? v : []; return <div className="flex flex-wrap gap-4">{f.options?.map((o) => <label key={o} className="flex items-center gap-2 text-sm"><Checkbox checked={arr.includes(o)} onCheckedChange={() => set(f.field_key, arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])} />{o}</label>)}</div>; }
      case "checkbox": return <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!v} onCheckedChange={(c) => set(f.field_key, !!c)} />Yes</label>;
      case "file": case "image": return <Input type="file" accept={f.field_type === "image" ? "image/*" : undefined} onChange={(e) => { const file = e.target.files?.[0]; setFiles((p) => { const n = { ...p }; if (file) n[f.field_key] = file; else delete n[f.field_key]; return n; }); }} />;
      case "student_select": return <NativeSelect className="w-full" value={s} onChange={(x) => set(f.field_key, x)}><option value="">Select student…</option>{students.data?.filter((x) => !batchId || x.batch_id === batchId).map((x) => <option key={x.id} value={`${x.roll_no} · ${x.full_name}`}>{x.roll_no} · {x.full_name}</option>)}</NativeSelect>;
      case "faculty_select": return <NativeSelect className="w-full" value={s} onChange={(x) => set(f.field_key, x)}><option value="">Select…</option>{faculty.data?.map((x) => <option key={x.id}>{x.full_name || x.email}</option>)}</NativeSelect>;
      case "hod_select": return <NativeSelect className="w-full" value={s} onChange={(x) => set(f.field_key, x)}><option value="">Select…</option>{hods.data?.map((x) => <option key={x.id}>{x.full_name || x.email}</option>)}</NativeSelect>;
      case "batch_select": return <NativeSelect className="w-full" value={s} onChange={(x) => set(f.field_key, x)}><option value="">Select…</option>{batches.data?.map((x) => <option key={x.id}>{x.code}</option>)}</NativeSelect>;
      default: return <Input value={s} placeholder={ph} onChange={(e) => set(f.field_key, e.target.value)} />;
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={fm.name} description={fm.description ?? `Form ${fm.code}`} />
      {cls.data && <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">Class context: <b>{cls.data.batches?.code}</b> · {cls.data.subject} · {hhmm(cls.data.start_time)}–{hhmm(cls.data.end_time)}</div>}
      <Panel className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Batch"><NativeSelect className="w-full" value={batchId} onChange={setBatchId}><option value="">None</option>{batches.data?.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</NativeSelect></Field>
          {primaryRole !== "student" && <Field label="Regarding student"><NativeSelect className="w-full" value={studentId} onChange={setStudentId}><option value="">None</option>{students.data?.filter((x) => !batchId || x.batch_id === batchId).map((x) => <option key={x.id} value={x.id}>{x.roll_no} · {x.full_name}</option>)}</NativeSelect></Field>}
        </div>
        {fm.form_fields.length === 0 && <p className="text-sm text-muted-foreground">This form has no fields yet. You can still submit it as a request.</p>}
        {fm.form_fields.map((f) => <Field key={f.id} label={f.label} required={f.is_required} {...(f.help_text ? { hint: f.help_text } : {})}>{render(f)}</Field>)}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" disabled={submit.isPending} onClick={() => submit.mutate(true)}>Save draft</Button>
          <Button disabled={submit.isPending} onClick={() => submit.mutate(false)}>{fm.workflow_steps.length ? "Submit for approval" : "Submit"}</Button>
        </div>
      </Panel>
    </div>
  );
}
