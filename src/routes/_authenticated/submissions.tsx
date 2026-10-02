import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/submissions")({
  head: () => ({ meta: [{ title: "Submissions — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Submissions" description="This section is coming in the next build step." />
    </div>
  ),
});
