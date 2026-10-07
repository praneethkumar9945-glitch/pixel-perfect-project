import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, NativeSelect, DataTable, ActivePill, Field, errMsg } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useBatches, useCourses, usePeopleByRole } from "@/lib/data";
import { ROLE_LABELS, logAudit, useCurrentUser, type AppRole } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

type FieldType = Database["public"]["Enums"]["field_type"];
const FIELD_TYPES: FieldType[] = ["text", "textarea", "number", "email", "phone", "date", "time", "datetime", "select", "multiselect", "radio", "checkbox", "file", "image", "student_select", "faculty_select", "batch_select", "hod_select"];
const ROLES: AppRole[] = ["student", "faculty", "hod", "admin", "super_admin"];

export const Route = createFileRoute("/_authenticated/forms")({
  head: () => ({ meta: [{ title: "Forms — University Manager" }, { name: "description", content: "Build forms, fields, approval steps and rules." }] }),
  component: FormsPage,
});

type FDraft = { id?: string; field_key: string; label: string; field_type: FieldType; is_required: boolean; options: string; placeholder: string; help_text: string; default_value: string; min_length: string; max_length: string };
type RDraft = { batch_id: string; course_id: string; faculty_id: string; valid_from: string; valid_to: string; is_active: boolean };
const blankForm = { code: "", name: "", description: "", target_roles: ["student"] as AppRole[], workflow_steps: ["hod", "admin"], is_active: true };

function FormsPage() {
  const { isStaff, userId, primaryRole } = useCurrentUser();
  const qc = useQueryClient();
  const batches = useBatches();
  const courses = useCourses();
  const faculty = usePeopleByRole("faculty");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(blankForm);
  const [fields, setFields] = useState<FDraft[]>([]);
  const [rules, setRules] = useState<RDraft[]>([]);

  const list = useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("forms").select("*, form_fields(*), form_rules(*)").order("name");
      if (error) throw error;
      return data;
    },
  });
  type Row = NonNullable<typeof list.data>[number];

  function edit(r?: Row) {
    setEditId(r?.id ?? null);
    setF(r ? { code: r.code, name: r.name, description: r.description ?? "", target_roles: r.target_roles, workflow_steps: r.workflow_steps, is_active: r.is_active } : blankForm);
    setFields((r?.form_fields ?? []).sort((a, b) => a.sort_order - b.sort_order).map((x) => ({
      field_key: x.field_key, label: x.label, field_type: x.field_type, is_required: x.is_required, options: (x.options ?? []).join(", "),
      placeholder: x.placeholder ?? "", help_text: x.help_text ?? "", default_value: x.default_value ?? "", min_length: x.min_length?.toString() ?? "", max_length: x.max_length?.toString() ?? "",
    })));
    setRules((r?.form_rules ?? []).map((x) => ({ batch_id: x.batch_id ?? "", course_id: x.course_id ?? "", faculty_id: x.faculty_id ?? "", valid_from: x.valid_from ?? "", valid_to: x.valid_to ?? "", is_active: x.is_active })));
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!f.code.trim() || !f.name.trim()) throw new Error("Code and name are required");
      if (!f.target_roles.length) throw new Error("Pick at least one audience");
      const keys = fields.map((x) => x.field_key.trim());
      if (keys.some((k) => !/^[a-z][a-z0-9_]*$/.test(k))) throw new Error("Field keys must be lowercase letters, numbers, underscores");
      if (new Set(keys).size !== keys.length) throw new Error("Field keys must be unique");
      if (fields.some((x) => !x.label.trim())) throw new Error("Every field needs a label");
      const row = { code: f.code.trim().toUpperCase(), name: f.name.trim(), description: f.description || null, target_roles: f.target_roles, workflow_steps: ["hod", "admin"].filter((s) => f.workflow_steps.includes(s)), is_active: f.is_active };
      let id = editId;
      if (id) {
        const { error } = await supabase.from("forms").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("forms").insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const d1 = await supabase.from("form_fields").delete().eq("form_id", id);
      if (d1.error) throw d1.error;
      if (fields.length) {
        const { error } = await supabase.from("form_fields").insert(fields.map((x, i) => ({
          form_id: id!, sort_order: i, field_key: x.field_key.trim(), label: x.label.trim(), field_type: x.field_type, is_required: x.is_required,
          options: x.options.trim() ? x.options.split(",").map((s) => s.trim()).filter(Boolean) : null,
          placeholder: x.placeholder || null, help_text: x.help_text || null, default_value: x.default_value || null,
          min_length: x.min_length ? Number(x.min_length) : null, max_length: x.max_length ? Number(x.max_length) : null,
        })));
        if (error) throw error;
      }
      const d2 = await supabase.from("form_rules").delete().eq("form_id", id);
      if (d2.error) throw d2.error;
      if (rules.length) {
        const { error } = await supabase.from("form_rules").insert(rules.map((x) => ({ form_id: id!, batch_id: x.batch_id || null, course_id: x.course_id || null, faculty_id: x.faculty_id || null, valid_from: x.valid_from || null, valid_to: x.valid_to || null, is_active: x.is_active })));
        if (error) throw error;
      }
      await logAudit({ userId, role: primaryRole, action: editId ? "update form" : "create form", module: "forms", recordId: row.code });
    },
    onSuccess: () => { toast.success("Form saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["forms"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const setField = (i: number, patch: Partial<FDraft>) => setFields(fields.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => { const n = [...fields]; const t = n[i]!; n[i] = n[i + d]!; n[i + d] = t; setFields(n); };
  const setRule = (i: number, patch: Partial<RDraft>) => setRules(rules.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const rows = (list.data ?? []).filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Forms" description="Form library, builder, approval workflow and applicability rules" action={isStaff && <Button size="sm" onClick={() => edit()}><Plus /> New form</Button>} />
      <Panel>
        <Toolbar><SearchBox value={q} onChange={setQ} /><span className="ml-auto text-xs text-muted-foreground">{rows.length} forms</span></Toolbar>
        <DataTable rows={rows} loading={list.isLoading} rowKey={(r) => r.id} columns={[
          { header: "Code", cell: (r) => <span className="font-mono text-xs font-bold text-primary">{r.code}</span> },
          { header: "Name", cell: (r) => <span className="font-bold">{r.name}</span> },
          { header: "Audience", cell: (r) => r.target_roles.map((x) => ROLE_LABELS[x as AppRole]).join(", ") },
          { header: "Approval", cell: (r) => (r.workflow_steps.length ? r.workflow_steps.map((s) => s.toUpperCase()).join(" → ") : "Auto-complete") },
          { header: "Fields", cell: (r) => r.form_fields.length },
          { header: "Rules", cell: (r) => r.form_rules.length || "Everyone" },
          { header: "Status", cell: (r) => <ActivePill active={r.is_active} /> },
          { header: "", className: "text-right", cell: (r) => (
            <div className="flex justify-end gap-1">
              <Button asChild size="sm" variant="ghost"><Link to="/fill/$formId" params={{ formId: r.id }} search={{}}><ExternalLink /> Open</Link></Button>
              {isStaff && <Button size="icon" variant="ghost" onClick={() => edit(r)}><Pencil /></Button>}
            </div>) },
        ]} />
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit form" : "New form"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="details">
            <TabsList><TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="fields">Fields ({fields.length})</TabsTrigger><TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger></TabsList>
            <TabsContent value="details" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code" required><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
                <Field label="Name" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              </div>
              <Field label="Description"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
              <Field label="Who can submit">
                <div className="flex flex-wrap gap-4">{ROLES.map((r) => <label key={r} className="flex items-center gap-2 text-sm"><Checkbox checked={f.target_roles.includes(r)} onCheckedChange={() => setF({ ...f, target_roles: toggleIn(f.target_roles, r) })} />{ROLE_LABELS[r]}</label>)}</div>
              </Field>
              <Field label="Approval steps" hint="Requests go through the ticked steps in order. None = completed on submit.">
                <div className="flex gap-4">{["hod", "admin"].map((s) => <label key={s} className="flex items-center gap-2 text-sm"><Checkbox checked={f.workflow_steps.includes(s)} onCheckedChange={() => setF({ ...f, workflow_steps: toggleIn(f.workflow_steps, s) })} />{s === "hod" ? "HOD approval" : "Admin approval"}</label>)}</div>
              </Field>
              <Field label="Active"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /></Field>
            </TabsContent>
            <TabsContent value="fields" className="space-y-3 pt-3">
              {fields.map((x, i) => (
                <div key={i} className="space-y-2 rounded-md border border-border p-3">
                  <div className="grid grid-cols-[1fr_1fr_160px_auto] items-end gap-2">
                    <Field label="Label" required><Input value={x.label} onChange={(e) => setField(i, { label: e.target.value, ...(x.field_key ? {} : {}) })} onBlur={() => !x.field_key && setField(i, { field_key: x.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") })} /></Field>
                    <Field label="Key" required><Input value={x.field_key} onChange={(e) => setField(i, { field_key: e.target.value })} /></Field>
                    <Field label="Type"><NativeSelect className="w-full" value={x.field_type} onChange={(v) => setField(i, { field_type: v as FieldType })}>{FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</NativeSelect></Field>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                      <Button size="icon" variant="ghost" disabled={i === fields.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setFields(fields.filter((_, j) => j !== i))}><Trash2 /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["select", "multiselect", "radio"].includes(x.field_type) && <Field label="Options (comma separated)"><Input value={x.options} onChange={(e) => setField(i, { options: e.target.value })} /></Field>}
                    <Field label="Placeholder"><Input value={x.placeholder} onChange={(e) => setField(i, { placeholder: e.target.value })} /></Field>
                    <Field label="Help text"><Input value={x.help_text} onChange={(e) => setField(i, { help_text: e.target.value })} /></Field>
                    <Field label="Default"><Input value={x.default_value} onChange={(e) => setField(i, { default_value: e.target.value })} /></Field>
                    <Field label="Min length"><Input type="number" value={x.min_length} onChange={(e) => setField(i, { min_length: e.target.value })} /></Field>
                    <Field label="Max length"><Input type="number" value={x.max_length} onChange={(e) => setField(i, { max_length: e.target.value })} /></Field>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={x.is_required} onCheckedChange={(v) => setField(i, { is_required: !!v })} />Required</label>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setFields([...fields, { field_key: "", label: "", field_type: "text", is_required: false, options: "", placeholder: "", help_text: "", default_value: "", min_length: "", max_length: "" }])}><Plus /> Add field</Button>
            </TabsContent>
            <TabsContent value="rules" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">No rules = available to everyone in the audience (faculty only see forms with a matching rule). Blank values match anything.</p>
              {rules.map((x, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-border p-3">
                  <Field label="Batch"><NativeSelect className="w-full" value={x.batch_id} onChange={(v) => setRule(i, { batch_id: v })}><option value="">Any</option>{batches.data?.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</NativeSelect></Field>
                  <Field label="Course"><NativeSelect className="w-full" value={x.course_id} onChange={(v) => setRule(i, { course_id: v })}><option value="">Any</option>{courses.data?.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</NativeSelect></Field>
                  <Field label="Faculty"><NativeSelect className="w-full" value={x.faculty_id} onChange={(v) => setRule(i, { faculty_id: v })}><option value="">Any</option>{faculty.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</NativeSelect></Field>
                  <Button size="icon" variant="ghost" onClick={() => setRules(rules.filter((_, j) => j !== i))}><Trash2 /></Button>
                  <Field label="Valid from"><Input type="date" value={x.valid_from} onChange={(e) => setRule(i, { valid_from: e.target.value })} /></Field>
                  <Field label="Valid to"><Input type="date" value={x.valid_to} onChange={(e) => setRule(i, { valid_to: e.target.value })} /></Field>
                  <label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={x.is_active} onCheckedChange={(v) => setRule(i, { is_active: v })} />Active</label>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setRules([...rules, { batch_id: "", course_id: "", faculty_id: "", valid_from: "", valid_to: "", is_active: true }])}><Plus /> Add rule</Button>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Save form</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
