import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, NativeSelect, DataTable } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAllProfiles, nameOf, downloadCsv } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit log — University Manager" }, { name: "description", content: "Who did what and when." }] }),
  component: AuditPage,
});

function AuditPage() {
  const people = useAllProfiles();
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("");
  const list = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const modules = [...new Set((list.data ?? []).map((r) => r.module))].sort();
  const rows = (list.data ?? []).filter((r) => (!mod || r.module === mod) && `${r.action} ${r.record_id ?? ""} ${nameOf(people.data, r.user_id)}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Audit log" description="Every important action is recorded" action={<Button size="sm" variant="outline" onClick={() => downloadCsv("audit.csv", rows.map((r) => ({ when: r.created_at, user: nameOf(people.data, r.user_id), role: r.user_role, module: r.module, action: r.action, record: r.record_id })))}><Download /> Export</Button>} />
      <Panel>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} />
          <NativeSelect value={mod} onChange={setMod}><option value="">All modules</option>{modules.map((m) => <option key={m}>{m}</option>)}</NativeSelect>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} entries</span>
        </Toolbar>
        <DataTable rows={rows} loading={list.isLoading} rowKey={(r) => r.id} columns={[
          { header: "When", cell: (r) => new Date(r.created_at).toLocaleString() },
          { header: "User", cell: (r) => nameOf(people.data, r.user_id) },
          { header: "Role", cell: (r) => r.user_role ?? "—" },
          { header: "Module", cell: (r) => <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.module}</span> },
          { header: "Action", cell: (r) => r.action },
          { header: "Record", cell: (r) => <span className="font-mono text-xs">{r.record_id ?? "—"}</span> },
        ]} />
      </Panel>
    </div>
  );
}
