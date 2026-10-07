import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, DataTable } from "@/components/kit";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useSubmissions, OPEN_STATUSES } from "@/lib/submissions";
import { useAllProfiles, nameOf } from "@/lib/data";
import { useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — University Manager" }, { name: "description", content: "Requests waiting for your decision." }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { isStaff, isHod } = useCurrentUser();
  const subs = useSubmissions();
  const people = useAllProfiles();
  const rows = (subs.data ?? []).filter((r) => OPEN_STATUSES.includes(r.status) && ((r.current_step === "hod" && isHod) || (r.current_step === "admin" && isStaff)));

  return (
    <div>
      <PageHeader title="Approvals" description="Requests waiting at your step" />
      <Panel>
        <Toolbar><span className="text-xs text-muted-foreground">{rows.length} pending</span></Toolbar>
        <DataTable rows={rows} loading={subs.isLoading} rowKey={(r) => r.id} empty={isStaff || isHod ? "Nothing waiting for you" : "Only HODs and administrators approve requests"} columns={[
          { header: "Reference", cell: (r) => <span className="font-mono text-xs font-bold text-primary">{r.reference_no}</span> },
          { header: "Form", cell: (r) => r.forms?.name },
          { header: "From", cell: (r) => nameOf(people.data, r.submitted_by) },
          { header: "Batch", cell: (r) => r.batches?.code ?? "—" },
          { header: "Step", cell: (r) => r.current_step?.toUpperCase() },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { header: "Waiting since", cell: (r) => new Date(r.updated_at).toLocaleString() },
          { header: "", className: "text-right", cell: (r) => <Button asChild size="sm"><Link to="/submissions/$id" params={{ id: r.id }}>Review</Link></Button> },
        ]} />
      </Panel>
    </div>
  );
}
