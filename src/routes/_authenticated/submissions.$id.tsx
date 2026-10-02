import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/submissions/$id")({
  component: () => <PageHeader title="Submission" description="Details view is coming in the next build step." />,
});
