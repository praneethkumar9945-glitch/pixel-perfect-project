import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, DataTable, ActivePill, Field, NativeSelect, errMsg } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBatches, useCourses, downloadCsv } from "@/lib/data";
import { logAudit, useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — University Manager" }, { name: "description", content: "Student roster with course and batch assignment." }] }),
  component: StudentsPage,
});

const blank = { roll_no: "", full_name: "", email: "", phone: "", course_id: "", batch_id: "", admission_date: "", is_active: true };

function StudentsPage() {
  const { isStaff, userId, primaryRole } = useCurrentUser();
  const qc = useQueryClient();
  const courses = useCourses();
  const batches = useBatches();
  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*, batches(code), courses(code)").order("roll_no");
      if (error) throw error;
      return data;
    },
  });
  const [q, setQ] = useState("");
  const [bf, setBf] = useState("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(blank);

  const save = useMutation({
    mutationFn: async () => {
      if (!f.roll_no.trim() || !f.full_name.trim()) throw new Error("Roll no and name are required");
      if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) throw new Error("Invalid email");
      const row = { roll_no: f.roll_no.trim(), full_name: f.full_name.trim(), email: f.email || null, phone: f.phone || null, course_id: f.course_id || null, batch_id: f.batch_id || null, is_active: f.is_active, ...(f.admission_date ? { admission_date: f.admission_date } : {}) };
      const { error } = editId ? await supabase.from("students").update(row).eq("id", editId) : await supabase.from("students").insert(row);
      if (error) throw error;
      await logAudit({ userId, role: primaryRole, action: editId ? "update student" : "create student", module: "students", recordId: row.roll_no });
    },
    onSuccess: () => { toast.success("Student saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["students"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  type S = NonNullable<typeof students.data>[number];
  function edit(s?: S) {
    setEditId(s?.id ?? null);
    setF(s ? { roll_no: s.roll_no, full_name: s.full_name, email: s.email ?? "", phone: s.phone ?? "", course_id: s.course_id ?? "", batch_id: s.batch_id ?? "", admission_date: s.admission_date ?? "", is_active: s.is_active } : blank);
    setOpen(true);
  }

  const rows = (students.data ?? []).filter((s) => (bf === "all" || s.batch_id === bf) && `${s.roll_no} ${s.full_name} ${s.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Students" description="Roster across all courses and batches"
        action={<div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadCsv("students.csv", rows.map((s) => ({ roll_no: s.roll_no, name: s.full_name, email: s.email, phone: s.phone, course: s.courses?.code, batch: s.batches?.code, admission: s.admission_date, active: s.is_active })))}><Download /> Export</Button>
          {isStaff && <Button size="sm" onClick={() => edit()}><Plus /> New student</Button>}
        </div>} />
      <Panel>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Search name, roll, email" />
          <NativeSelect value={bf} onChange={setBf}><option value="all">All batches</option>{batches.data?.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</NativeSelect>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} students</span>
        </Toolbar>
        <DataTable rows={rows} loading={students.isLoading} rowKey={(r) => r.id}
          columns={[
            { header: "Roll no", cell: (r) => <span className="font-mono text-xs font-bold text-primary">{r.roll_no}</span> },
            { header: "Name", cell: (r) => <span className="font-bold">{r.full_name}</span> },
            { header: "Email", cell: (r) => r.email ?? "—" },
            { header: "Phone", cell: (r) => r.phone ?? "—" },
            { header: "Course", cell: (r) => r.courses?.code ?? "—" },
            { header: "Batch", cell: (r) => r.batches?.code ?? "—" },
            { header: "Status", cell: (r) => <ActivePill active={r.is_active} /> },
            ...(isStaff ? [{ header: "", className: "text-right", cell: (r: S) => <Button size="icon" variant="ghost" className="size-7" onClick={() => edit(r)}><Pencil className="size-3.5" /></Button> }] : []),
          ]} />
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit student" : "New student"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Roll no" required><Input value={f.roll_no} onChange={(e) => setF({ ...f, roll_no: e.target.value })} /></Field>
            <Field label="Full name" required><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
            <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Course"><NativeSelect className="w-full" value={f.course_id} onChange={(v) => setF({ ...f, course_id: v })}><option value="">—</option>{courses.data?.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</NativeSelect></Field>
            <Field label="Batch"><NativeSelect className="w-full" value={f.batch_id} onChange={(v) => setF({ ...f, batch_id: v })}><option value="">—</option>{batches.data?.filter((b) => !f.course_id || b.course_id === f.course_id).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</NativeSelect></Field>
            <Field label="Admission date"><Input type="date" value={f.admission_date} onChange={(e) => setF({ ...f, admission_date: e.target.value })} /></Field>
            <Field label="Active"><div className="pt-1.5"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /></div></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
