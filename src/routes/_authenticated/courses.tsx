import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, DataTable, ActivePill, Field, errMsg } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCourses } from "@/lib/data";
import { logAudit, useCurrentUser } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

type Course = Database["public"]["Tables"]["courses"]["Row"];

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({ meta: [{ title: "Courses — University Manager" }, { name: "description", content: "Manage academic courses and programs." }] }),
  component: CoursesPage,
});

const blank = { code: "", name: "", program: "", department: "", duration_months: "", description: "", is_active: true };

function CoursesPage() {
  const courses = useCourses();
  const { isStaff, userId, primaryRole } = useCurrentUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(blank);

  const save = useMutation({
    mutationFn: async () => {
      if (!f.code.trim() || !f.name.trim()) throw new Error("Code and name are required");
      const row = {
        code: f.code.trim(), name: f.name.trim(), program: f.program || null, department: f.department || null,
        duration_months: f.duration_months ? Number(f.duration_months) : null, description: f.description || null, is_active: f.is_active,
      };
      const { error } = editId ? await supabase.from("courses").update(row).eq("id", editId) : await supabase.from("courses").insert(row);
      if (error) throw error;
      await logAudit({ userId, role: primaryRole, action: editId ? "update course" : "create course", module: "courses", recordId: row.code });
    },
    onSuccess: () => { toast.success("Course saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["courses"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const toggle = useMutation({
    mutationFn: async (c: Course) => {
      const { error } = await supabase.from("courses").update({ is_active: !c.is_active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
    onError: (e) => toast.error(errMsg(e)),
  });

  function edit(c?: Course) {
    setEditId(c?.id ?? null);
    setF(c ? { code: c.code, name: c.name, program: c.program ?? "", department: c.department ?? "", duration_months: c.duration_months?.toString() ?? "", description: c.description ?? "", is_active: c.is_active } : blank);
    setOpen(true);
  }

  const rows = (courses.data ?? []).filter((c) => `${c.code} ${c.name} ${c.department ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Courses" description="Programs offered by the institution" action={isStaff && <Button size="sm" onClick={() => edit()}><Plus /> New course</Button>} />
      <Panel>
        <Toolbar><SearchBox value={q} onChange={setQ} /><span className="ml-auto text-xs text-muted-foreground">{rows.length} courses</span></Toolbar>
        <DataTable
          rows={rows} loading={courses.isLoading} rowKey={(r) => r.id}
          columns={[
            { header: "Code", cell: (r) => <span className="font-mono text-xs font-bold text-primary">{r.code}</span> },
            { header: "Name", cell: (r) => <span className="font-bold">{r.name}</span> },
            { header: "Program", cell: (r) => r.program ?? "—" },
            { header: "Department", cell: (r) => r.department ?? "—" },
            { header: "Duration", cell: (r) => (r.duration_months ? `${r.duration_months} mo` : "—") },
            { header: "Status", cell: (r) => <ActivePill active={r.is_active} /> },
            ...(isStaff ? [{ header: "", className: "text-right", cell: (r: Course) => (
              <div className="flex justify-end gap-2">
                <Switch checked={r.is_active} onCheckedChange={() => toggle.mutate(r)} />
                <Button size="icon" variant="ghost" className="size-7" onClick={() => edit(r)}><Pencil className="size-3.5" /></Button>
              </div>) }] : []),
          ]}
        />
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit course" : "New course"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code" required><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
            <Field label="Name" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Program"><Input value={f.program} onChange={(e) => setF({ ...f, program: e.target.value })} /></Field>
            <Field label="Department"><Input value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field>
            <Field label="Duration (months)"><Input type="number" value={f.duration_months} onChange={(e) => setF({ ...f, duration_months: e.target.value })} /></Field>
            <Field label="Active"><div className="pt-1.5"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /></div></Field>
            <div className="col-span-2"><Field label="Description"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
