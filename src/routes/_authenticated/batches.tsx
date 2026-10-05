import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, DataTable, Field, NativeSelect, errMsg } from "@/components/kit";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBatches, useCourses, usePeopleByRole, nameOf } from "@/lib/data";
import { logAudit, useCurrentUser } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["batch_status"];

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches — University Manager" }, { name: "description", content: "Create batches and assign HODs and faculty." }] }),
  component: BatchesPage,
});

const blank = { code: "", name: "", course_id: "", hod_id: "", start_date: "", end_date: "", capacity: "60", status: "draft" as Status, remarks: "", faculty: [] as string[] };

function BatchesPage() {
  const batches = useBatches();
  const courses = useCourses();
  const hods = usePeopleByRole("hod");
  const faculty = usePeopleByRole("faculty");
  const { isStaff, userId, primaryRole } = useCurrentUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(blank);

  const save = useMutation({
    mutationFn: async () => {
      if (!f.code.trim() || !f.name.trim()) throw new Error("Code and name are required");
      if (f.start_date && f.end_date && f.end_date < f.start_date) throw new Error("End date must be after start date");
      const row = {
        code: f.code.trim(), name: f.name.trim(), course_id: f.course_id || null, hod_id: f.hod_id || null,
        start_date: f.start_date || null, end_date: f.end_date || null, capacity: Number(f.capacity) || 60, status: f.status, remarks: f.remarks || null,
      };
      let id = editId;
      if (id) {
        const { error } = await supabase.from("batches").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("batches").insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const { error: de } = await supabase.from("batch_faculty").delete().eq("batch_id", id);
      if (de) throw de;
      if (f.faculty.length) {
        const { error: ie } = await supabase.from("batch_faculty").insert(f.faculty.map((fid) => ({ batch_id: id!, faculty_id: fid })));
        if (ie) throw ie;
      }
      await logAudit({ userId, role: primaryRole, action: editId ? "update batch" : "create batch", module: "batches", recordId: row.code });
    },
    onSuccess: () => { toast.success("Batch saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["batches"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  type B = NonNullable<typeof batches.data>[number];
  function edit(b?: B) {
    setEditId(b?.id ?? null);
    setF(b ? { code: b.code, name: b.name, course_id: b.course_id ?? "", hod_id: b.hod_id ?? "", start_date: b.start_date ?? "", end_date: b.end_date ?? "", capacity: String(b.capacity ?? 60), status: b.status, remarks: b.remarks ?? "", faculty: b.batch_faculty.map((x) => x.faculty_id) } : blank);
    setOpen(true);
  }

  const rows = (batches.data ?? []).filter((b) => (st === "all" || b.status === st) && `${b.code} ${b.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Batches" description="Cohorts, HOD ownership and faculty assignment" action={isStaff && <Button size="sm" onClick={() => edit()}><Plus /> New batch</Button>} />
      <Panel>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} />
          <NativeSelect value={st} onChange={setSt}>
            <option value="all">All statuses</option>
            {["draft", "active", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} batches</span>
        </Toolbar>
        <DataTable rows={rows} loading={batches.isLoading} rowKey={(r) => r.id}
          columns={[
            { header: "Code", cell: (r) => <span className="font-mono text-xs font-bold text-primary">{r.code}</span> },
            { header: "Name", cell: (r) => <span className="font-bold">{r.name}</span> },
            { header: "Course", cell: (r) => r.courses?.code ?? "—" },
            { header: "HOD", cell: (r) => nameOf(hods.data, r.hod_id) },
            { header: "Faculty", cell: (r) => r.batch_faculty.length },
            { header: "Dates", cell: (r) => <span className="text-xs">{r.start_date ?? "—"} → {r.end_date ?? "—"}</span> },
            { header: "Capacity", cell: (r) => r.capacity },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ...(isStaff ? [{ header: "", className: "text-right", cell: (r: B) => <Button size="icon" variant="ghost" className="size-7" onClick={() => edit(r)}><Pencil className="size-3.5" /></Button> }] : []),
          ]}
        />
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit batch" : "New batch"}</DialogTitle></DialogHeader>
          <div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
            <Field label="Code" required><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
            <Field label="Name" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Course"><NativeSelect className="w-full" value={f.course_id} onChange={(v) => setF({ ...f, course_id: v })}><option value="">—</option>{courses.data?.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</NativeSelect></Field>
            <Field label="HOD"><NativeSelect className="w-full" value={f.hod_id} onChange={(v) => setF({ ...f, hod_id: v })}><option value="">—</option>{hods.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</NativeSelect></Field>
            <Field label="Start date"><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
            <Field label="Capacity"><Input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field>
            <Field label="Status"><NativeSelect className="w-full" value={f.status} onChange={(v) => setF({ ...f, status: v as Status })}>{["draft", "active", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</NativeSelect></Field>
            <div className="col-span-2"><Field label="Assigned faculty">
              <div className="grid max-h-40 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border border-border p-2">
                {faculty.data?.length ? faculty.data.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={f.faculty.includes(p.id)} onCheckedChange={(v) => setF({ ...f, faculty: v ? [...f.faculty, p.id] : f.faculty.filter((x) => x !== p.id) })} />
                    {p.full_name || p.email}
                  </label>
                )) : <p className="text-xs text-muted-foreground">No faculty yet — assign the Faculty role in Users & roles.</p>}
              </div>
            </Field></div>
            <div className="col-span-2"><Field label="Remarks"><Textarea value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
