import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/fill/$formId")({
  validateSearch: (s: Record<string, unknown>): { classId?: string } => ({
    classId: typeof s.classId === "string" ? s.classId : undefined,
  }),
  component: () => <PageHeader title="Fill form" description="Form filling is coming in the next build step." />,
});
