import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Students" description="This section is coming in the next build step." />
    </div>
  ),
});
