import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Audit" description="This section is coming in the next build step." />
    </div>
  ),
});
