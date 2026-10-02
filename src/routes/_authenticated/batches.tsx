import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Batches" description="This section is coming in the next build step." />
    </div>
  ),
});
