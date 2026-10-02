import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Reports" description="This section is coming in the next build step." />
    </div>
  ),
});
