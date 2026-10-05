import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, DataTable, ActivePill, Field, NativeSelect, errMsg } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePeopleByRole } from "@/lib/data";
import { ROLE_LABELS, useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/people")({
  head: () => ({ meta: [{ title: "Faculty & HODs — University Manager" }, { name: "description", content: "Directory of faculty and heads of department." }] }),
  component: PeoplePage,
});

function PeoplePage() {
  const people = usePeopleByRole(["faculty", "hod"]);
  const { isStaff } = useCurrentUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [rf, setRf] = useState("all");
  type P = NonNullable<typeof people.data>[number];
  const [edit, setEdit] = useState<P | null>(null);

  const save = useMutation({
    mutationFn: async (p: P) => {
      const { error } = await supabase.from("profiles").update({ full_name: p.full_name, phone: p.phone, department: p.department, staff_id: p.staff_id, is_active: p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); setEdit(null); qc.invalidateQueries({ queryKey: ["people"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const rows = (people.data ?? []).filter((p) => (rf === "all" || p.roles.includes(rf as "hod")) && `${p.full_name} ${p.email} ${p.department ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Faculty & HODs" description="Teaching staff directory. Assign roles in Users & roles." />
      <Panel>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} />
          <NativeSelect value={rf} onChange={setRf}><option value="all">All</option><option value="faculty">Faculty</option><option value="hod">HOD</option></NativeSelect>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} people</span>
        </Toolbar>
        <DataTable rows={rows} loading={people.isLoading} rowKey={(r) => r.id} empty="No faculty or HODs yet"
          columns={[
            { header: "Name", cell: (r) => <span className="font-bold">{r.full_name || "—"}</span> },
            { header: "Email", cell: (r) => r.email },
            { header: "Staff ID", cell: (r) => r.staff_id ?? "—" },
            { header: "Department", cell: (r) => r.department ?? "—" },
            { header: "Phone", cell: (r) => r.phone ?? "—" },
            { header: "Roles", cell: (r) => <div className="flex gap-1">{r.roles.map((x) => <span key={x} className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground">{ROLE_LABELS[x]}</span>)}</div> },
            { header: "Status", cell: (r) => <ActivePill active={r.is_active} /> },
            ...(isStaff ? [{ header: "", className: "text-right", cell: (r: P) => <Button size="icon" variant="ghost" className="size-7" onClick={() => setEdit({ ...r })}><Pencil className="size-3.5" /></Button> }] : []),
          ]} />
      </Panel>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
          {edit && <div className="grid grid-cols-2 gap-3">
            <Field label="Full name"><Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></Field>
            <Field label="Staff ID"><Input value={edit.staff_id ?? ""} onChange={(e) => setEdit({ ...edit, staff_id: e.target.value || null })} /></Field>
            <Field label="Department"><Input value={edit.department ?? ""} onChange={(e) => setEdit({ ...edit, department: e.target.value || null })} /></Field>
            <Field label="Phone"><Input value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value || null })} /></Field>
            <Field label="Active"><div className="pt-1.5"><Switch checked={edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /></div></Field>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => edit && save.mutate(edit)} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
