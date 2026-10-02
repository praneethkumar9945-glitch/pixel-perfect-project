import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Notifications" description="This section is coming in the next build step." />
    </div>
  ),
});
