import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Approvals" description="This section is coming in the next build step." />
    </div>
  ),
});
