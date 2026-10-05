import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, DataTable, ActivePill, NativeSelect, errMsg } from "@/components/kit";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, logAudit, useCurrentUser, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users & roles — University Manager" }, { name: "description", content: "Assign roles and manage account status." }] }),
  component: UsersPage,
});

const ALL_ROLES: AppRole[] = ["super_admin", "admin", "hod", "faculty", "student"];

function UsersPage() {
  const { isStaff, roles: myRoles, userId, primaryRole } = useCurrentUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const users = useQuery({
    queryKey: ["users-roles"],
    enabled: isStaff,
    queryFn: async () => {
      const [{ data: profs, error }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("id, user_id, role"),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      return (profs ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id) }));
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["users-roles"] }); qc.invalidateQueries({ queryKey: ["people"] }); };

  const add = useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: AppRole }) => {
      if (role === "super_admin" && !myRoles.includes("super_admin")) throw new Error("Only a Super Admin can grant Super Admin");
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) throw error;
      await logAudit({ userId, role: primaryRole, action: `grant ${role}`, module: "users", recordId: uid });
    },
    onSuccess: () => { toast.success("Role granted"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: async ({ id, uid, role }: { id: string; uid: string; role: AppRole }) => {
      if (uid === userId && (role === "super_admin" || role === "admin")) throw new Error("You can't remove your own admin role");
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
      await logAudit({ userId, role: primaryRole, action: `revoke ${role}`, module: "users", recordId: uid });
    },
    onSuccess: () => { toast.success("Role removed"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (id === userId) throw new Error("You can't deactivate yourself");
      const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  if (!isStaff) return <PageHeader title="Users & roles" description="Only administrators can manage users." />;
  type U = NonNullable<typeof users.data>[number];
  const rows = (users.data ?? []).filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Users & roles" description="New people register from the sign-in page, then you grant their roles here." />
      <Panel>
        <Toolbar><SearchBox value={q} onChange={setQ} /><span className="ml-auto text-xs text-muted-foreground">{rows.length} users</span></Toolbar>
        <DataTable rows={rows} loading={users.isLoading} rowKey={(r) => r.id}
          columns={[
            { header: "Name", cell: (r: U) => <span className="font-bold">{r.full_name || "—"}</span> },
            { header: "Email", cell: (r: U) => r.email },
            { header: "Roles", cell: (r: U) => (
              <div className="flex flex-wrap items-center gap-1">
                {r.roles.map((x) => (
                  <span key={x.id} className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                    {ROLE_LABELS[x.role]}
                    <button onClick={() => remove.mutate({ id: x.id, uid: r.id, role: x.role })} aria-label="Remove role"><X className="size-3" /></button>
                  </span>
                ))}
                <NativeSelect className="h-6 text-xs" value="" onChange={(v) => v && add.mutate({ uid: r.id, role: v as AppRole })}>
                  <option value="">+ Add role</option>
                  {ALL_ROLES.filter((x) => !r.roles.some((y) => y.role === x)).map((x) => <option key={x} value={x}>{ROLE_LABELS[x]}</option>)}
                </NativeSelect>
              </div>) },
            { header: "Joined", cell: (r: U) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString()}</span> },
            { header: "Status", cell: (r: U) => <ActivePill active={r.is_active} /> },
            { header: "", className: "text-right", cell: (r: U) => <Switch checked={r.is_active} onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })} /> },
          ]} />
      </Panel>
    </div>
  );
}
