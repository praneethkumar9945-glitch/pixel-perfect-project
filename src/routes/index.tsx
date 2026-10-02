import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarRange, CheckCircle2, FileText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "University Manager — Administrative & Faculty Management" },
      {
        name: "description",
        content: "Timetable-driven faculty tasks, dynamic forms and HOD/admin approval workflows for universities.",
      },
      { property: "og:title", content: "University Manager — Administrative & Faculty Management" },
      {
        property: "og:description",
        content: "Timetable-driven faculty tasks, dynamic forms and HOD/admin approval workflows.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const features = [
    { icon: CalendarRange, title: "Timetable engine", text: "Batch and class timings drive what every faculty member sees." },
    { icon: FileText, title: "Dynamic forms", text: "Build any administrative form without touching code." },
    { icon: CheckCircle2, title: "Approval workflows", text: "Faculty → HOD → Administration, with a full audit trail." },
    { icon: Users, title: "Role dashboards", text: "Super Admin, Admin, HOD, Faculty and Student views." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
            UM
          </div>
          <span className="font-display font-semibold">University Manager</span>
        </div>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <p className="stat-label">Education administration</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold leading-[1.05]">
          The right class, the right forms, at the right time.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Administration configures batches and timetables once. Faculty dashboards update
          automatically, and every form flows through HOD and admin approval.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">Open the console</Link>
        </Button>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-3 font-display font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
