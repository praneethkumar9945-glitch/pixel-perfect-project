import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({ meta: [{ title: "Courses — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Courses" description="This section is coming in the next build step." />
    </div>
  ),
});
