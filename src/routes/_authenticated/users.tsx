import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Users" description="This section is coming in the next build step." />
    </div>
  ),
});
