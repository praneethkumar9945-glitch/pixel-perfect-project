import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/forms")({
  head: () => ({ meta: [{ title: "Forms — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Forms" description="This section is coming in the next build step." />
    </div>
  ),
});
