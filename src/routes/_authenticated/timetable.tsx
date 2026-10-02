import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({ meta: [{ title: "Timetable — University Manager" }] }),
  component: () => (
    <div>
      <PageHeader title="Timetable" description="This section is coming in the next build step." />
    </div>
  ),
});
