import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, SearchBox, NativeSelect, DataTable } from "@/components/kit";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useSubmissions } from "@/lib/submissions";
import { useAllProfiles, nameOf, downloadCsv } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/submissions")({
  head: () => ({ meta: [{ title: "Submissions — University Manager" }, { name: "description", content: "Track every submitted form and request." }] }),
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const subs = useSubmissions();
  const people = useAllProfiles();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const rows = (subs.data ?? []).filter((r) => (!status || r.status === status) && `${r.reference_no} ${r.forms?.name} ${r.students?.full_name ?? ""} ${nameOf(people.data, r.submitted_by)}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Submissions" description="All requests and forms you can access" action={<Button size="sm" variant="outline" onClick={() => downloadCsv("submissions.csv", rows.map((r) => ({ reference: r.reference_no, form: r.forms?.name, status: r.status, step: r.current_step, batch: r.batches?.code, student: r.students?.full_name, submitted_by: nameOf(people.data, r.submitted_by), created: r.created_at })))}><Download /> Export</Button>} />
      <Panel>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Reference, form, person…" />
          <NativeSelect value={status} onChange={setStatus}><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} records</span>
        </Toolbar>
        <DataTable rows={rows} loading={subs.isLoading} rowKey={(r) => r.id} columns={[
          { header: "Reference", cell: (r) => <Link to="/submissions/$id" params={{ id: r.id }} className="font-mono text-xs font-bold text-primary hover:underline">{r.reference_no}</Link> },
          { header: "Form", cell: (r) => r.forms?.name },
          { header: "Submitted by", cell: (r) => nameOf(people.data, r.submitted_by) },
          { header: "Student", cell: (r) => r.students?.full_name ?? "—" },
          { header: "Batch", cell: (r) => r.batches?.code ?? "—" },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { header: "Waiting on", cell: (r) => r.current_step?.toUpperCase() ?? "—" },
          { header: "Date", cell: (r) => new Date(r.created_at).toLocaleDateString() },
        ]} />
      </Panel>
    </div>
  );
}
