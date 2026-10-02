import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/people")({
  head: () => ({ meta: [{ title: "People — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="People" description="This section is coming in the next build step." />
    </div>
  ),
});
