import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, NativeSelect, DataTable, ActivePill, Field, errMsg } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBatches, usePeopleByRole, nameOf } from "@/lib/data";
import { DAYS, hhmm } from "@/lib/status";
import { logAudit, useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({ meta: [{ title: "Timetable — University Manager" }, { name: "description", content: "Weekly class timings for every batch." }] }),
  component: TimetablePage,
});

const blank = { batch_id: "", day_of_week: "1", start_time: "09:00", end_time: "10:00", subject: "", room: "", faculty_id: "", is_active: true };

function TimetablePage() {
  const { isStaff, userId, primaryRole } = useCurrentUser();
  const batches = useBatches();
  const faculty = usePeopleByRole("faculty");
  const qc = useQueryClient();
  const [batch, setBatch] = useState("");
  const [day, setDay] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(blank);

  const list = useQuery({
    queryKey: ["timings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("class_timings").select("*, batches(code)").order("day_of_week").order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!f.batch_id || !f.subject.trim()) throw new Error("Batch and subject are required");
      if (f.end_time <= f.start_time) throw new Error("End time must be after start time");
      const row = { batch_id: f.batch_id, day_of_week: Number(f.day_of_week), start_time: f.start_time, end_time: f.end_time, subject: f.subject.trim(), room: f.room || null, faculty_id: f.faculty_id || null, is_active: f.is_active };
      const { error } = editId ? await supabase.from("class_timings").update(row).eq("id", editId) : await supabase.from("class_timings").insert(row);
      if (error) throw error;
      await logAudit({ userId, role: primaryRole, action: editId ? "update timing" : "create timing", module: "timetable" });
    },
    onSuccess: () => { toast.success("Class timing saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["timings"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_timings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["timings"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  type Row = NonNullable<typeof list.data>[number];
  function edit(r?: Row) {
    setEditId(r?.id ?? null);
    setF(r ? { batch_id: r.batch_id, day_of_week: String(r.day_of_week), start_time: hhmm(r.start_time), end_time: hhmm(r.end_time), subject: r.subject, room: r.room ?? "", faculty_id: r.faculty_id ?? "", is_active: r.is_active } : { ...blank, batch_id: batch });
    setOpen(true);
  }

  const rows = (list.data ?? []).filter((r) => (!batch || r.batch_id === batch) && (!day || String(r.day_of_week) === day));

  return (
    <div>
      <PageHeader title="Timetable" description="Class timings drive what faculty see on their dashboard" action={isStaff && <Button size="sm" onClick={() => edit()}><Plus /> New class</Button>} />
      <Panel>
        <Toolbar>
          <NativeSelect value={batch} onChange={setBatch}><option value="">All batches</option>{batches.data?.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</NativeSelect>
          <NativeSelect value={day} onChange={setDay}><option value="">All days</option>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</NativeSelect>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} classes</span>
        </Toolbar>
        <DataTable rows={rows} loading={list.isLoading} rowKey={(r) => r.id} columns={[
          { header: "Day", cell: (r) => DAYS[r.day_of_week] },
          { header: "Time", cell: (r) => <span className="font-mono text-xs">{hhmm(r.start_time)}–{hhmm(r.end_time)}</span> },
          { header: "Batch", cell: (r) => <span className="font-bold text-primary">{r.batches?.code}</span> },
          { header: "Subject", cell: (r) => r.subject },
          { header: "Room", cell: (r) => r.room ?? "—" },
          { header: "Faculty", cell: (r) => nameOf(faculty.data, r.faculty_id) },
          { header: "Status", cell: (r) => <ActivePill active={r.is_active} /> },
          ...(isStaff ? [{ header: "", className: "text-right", cell: (r: Row) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" onClick={() => edit(r)}><Pencil /></Button>
              <Button size="icon" variant="ghost" onClick={() => confirm("Delete this class?") && del.mutate(r.id)}><Trash2 /></Button>
            </div>) }] : []),
        ]} />
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit class" : "New class"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch" required><NativeSelect className="w-full" value={f.batch_id} onChange={(v) => setF({ ...f, batch_id: v })}><option value="">Select…</option>{batches.data?.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</NativeSelect></Field>
            <Field label="Day" required><NativeSelect className="w-full" value={f.day_of_week} onChange={(v) => setF({ ...f, day_of_week: v })}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</NativeSelect></Field>
            <Field label="Start" required><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></Field>
            <Field label="End" required><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} /></Field>
            <Field label="Subject" required><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
            <Field label="Room"><Input value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} /></Field>
            <Field label="Faculty"><NativeSelect className="w-full" value={f.faculty_id} onChange={(v) => setF({ ...f, faculty_id: v })}><option value="">Unassigned</option>{faculty.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</NativeSelect></Field>
            <Field label="Active"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
