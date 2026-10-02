import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, FileText, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, ROLE_LABELS } from "@/lib/auth";
import { fetchApplicableForms, fetchFacultyDay, nowHHMM, useAllProfiles, nameOf } from "@/lib/data";
import { DAYS, hhmm } from "@/lib/status";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — University Manager" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useCurrentUser();
  if (me.loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (me.isStaff) return <AdminDashboard />;
  if (me.isHod) return <HodDashboard />;
  if (me.isFaculty) return <FacultyDashboard />;
  return <StudentDashboard />;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="gap-0 p-4 transition-shadow hover:shadow-md">
      <p className="stat-label">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function SubmissionRows({ rows }: { rows: { id: string; reference_no: string; status: string; created_at: string; forms: { name: string } | null; batches: { code: string } | null }[] }) {
  if (!rows.length) return <p className="px-4 py-6 text-sm text-muted-foreground">Nothing here yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((s) => (
        <li key={s.id}>
          <Link
            to="/submissions/$id"
            params={{ id: s.id }}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.forms?.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {s.reference_no} · {s.batches?.code ?? "—"} · {new Date(s.created_at).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={s.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const SUB_SELECT = "id, reference_no, status, current_step, created_at, forms(name), batches(code)";

function AdminDashboard() {
  const now = useClock();
  const day = now.getDay();
  const profiles = useAllProfiles();

  const stats = useQuery({
    queryKey: ["admin-stats", day],
    queryFn: async () => {
      const c = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
      const [students, faculty, hods, batches, classes, pending, completed] = await Promise.all([
        c(supabase.from("students").select("id", { count: "exact", head: true })),
        c(supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "faculty")),
        c(supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "hod")),
        c(supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "active")),
        c(supabase.from("class_timings").select("id", { count: "exact", head: true }).eq("day_of_week", day)),
        c(supabase.from("form_submissions").select("id", { count: "exact", head: true }).in("status", ["submitted", "hod_approved", "admin_approved", "under_review"])),
        c(supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("status", "completed")),
      ]);
      const { count: adminPending } = await supabase
        .from("form_submissions")
        .select("id", { count: "exact", head: true })
        .eq("current_step", "admin");
      return { students, faculty, hods, batches, classes, pending, completed, adminPending: adminPending ?? 0 };
    },
  });

  const schedule = useQuery({
    queryKey: ["today-schedule", day],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_timings")
        .select("*, batches!inner(code, status)")
        .eq("day_of_week", day)
        .eq("batches.status", "active")
        .order("start_time");
      return data ?? [];
    },
  });

  const recent = useQuery({
    queryKey: ["recent-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("form_submissions").select(SUB_SELECT).order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const byStatus = useQuery({
    queryKey: ["subs-by-status"],
    queryFn: async () => {
      const { data } = await supabase.from("form_submissions").select("status");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r) => (counts[r.status] = (counts[r.status] ?? 0) + 1));
      return Object.entries(counts).map(([status, count]) => ({ status: status.replace(/_/g, " "), count }));
    },
  });

  const s = stats.data;
  const t = nowHHMM(now);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Administration dashboard"
        description={`${DAYS[day]}, ${now.toLocaleDateString(undefined, { day: "numeric", month: "long" })} · ${hhmm(t)}`}
        action={
          <Button asChild>
            <Link to="/timetable">Manage timetable</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total students" value={s?.students ?? "—"} />
        <Stat label="Total faculty" value={s?.faculty ?? "—"} />
        <Stat label="Total HODs" value={s?.hods ?? "—"} />
        <Stat label="Active batches" value={s?.batches ?? "—"} />
        <Stat label="Today's classes" value={s?.classes ?? "—"} />
        <Stat label="Pending forms" value={s?.pending ?? "—"} />
        <Stat label="Awaiting admin" value={s?.adminPending ?? "—"} hint="Pending approvals" />
        <Stat label="Completed forms" value={s?.completed ?? "—"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="gap-0 p-0 xl:col-span-2">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">Today's class schedule</h2>
            <p className="stat-label mt-0.5">{DAYS[day]}</p>
          </div>
          <ul className="divide-y divide-border">
            {(schedule.data ?? []).map((c) => {
              const live = c.start_time <= t && t < c.end_time;
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-24 shrink-0 font-mono text-[11px] text-muted-foreground">
                    {hhmm(c.start_time)}–{hhmm(c.end_time)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.batches?.code} · {c.room ?? "—"} · {nameOf(profiles.data, c.faculty_id)}
                    </p>
                  </div>
                  {live && <StatusBadge status="active" className="normal-case" />}
                </li>
              );
            })}
            {!schedule.data?.length && <li className="px-4 py-6 text-sm text-muted-foreground">No classes today.</li>}
          </ul>
        </Card>

        <Card className="gap-0 p-0 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">Recent form submissions</h2>
            <Link to="/submissions" className="text-xs font-medium text-primary">View all</Link>
          </div>
          <SubmissionRows rows={recent.data ?? []} />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-[15px] font-semibold">Submissions by status</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="status" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function HodDashboard() {
  const me = useCurrentUser();
  const pending = useQuery({
    queryKey: ["hod-pending"],
    queryFn: async () => {
      const { data } = await supabase.from("form_submissions").select(SUB_SELECT).eq("current_step", "hod").order("created_at");
      return data ?? [];
    },
  });
  const batches = useQuery({
    queryKey: ["hod-batches", me.userId],
    queryFn: async () => {
      const { data } = await supabase.from("batches").select("*, courses(name), batch_faculty(faculty_id)").eq("hod_id", me.userId!);
      return data ?? [];
    },
    enabled: !!me.userId,
  });
  return (
    <div className="space-y-5">
      <PageHeader title="HOD dashboard" description="Review faculty submissions and oversee your batches." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Awaiting my approval" value={pending.data?.length ?? "—"} />
        <Stat label="My batches" value={batches.data?.length ?? "—"} />
        <Stat label="Assigned faculty" value={new Set((batches.data ?? []).flatMap((b) => b.batch_faculty.map((f) => f.faculty_id))).size} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">Pending HOD approvals</h2>
            <Link to="/approvals" className="text-xs font-medium text-primary">Open queue</Link>
          </div>
          <SubmissionRows rows={pending.data ?? []} />
        </Card>
        <Card className="gap-0 p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">My batches</h2>
          </div>
          <ul className="divide-y divide-border">
            {(batches.data ?? []).map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">{b.code}</p>
                  <p className="text-xs text-muted-foreground">{b.courses?.name} · {b.batch_faculty.length} faculty</p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
            {!batches.data?.length && <li className="px-4 py-6 text-sm text-muted-foreground">No batches assigned to you yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function FacultyDashboard() {
  const me = useCurrentUser();
  const now = useClock();
  const day = now.getDay();
  const t = nowHHMM(now);

  const today = useQuery({
    queryKey: ["faculty-day", me.userId, day],
    enabled: !!me.userId,
    queryFn: () => fetchFacultyDay(me.userId!, day),
    refetchInterval: 60_000,
  });

  const current = (today.data ?? []).find((c) => c.start_time <= t && t < c.end_time);
  const upcoming = (today.data ?? []).filter((c) => c.start_time > t);

  const tasks = useQuery({
    queryKey: ["faculty-tasks", me.userId, current?.id],
    enabled: !!me.userId && !!current,
    queryFn: () =>
      fetchApplicableForms({
        role: "faculty",
        batchId: current!.batch_id,
        courseId: current!.batches.course_id,
        facultyId: me.userId,
      }),
  });

  const doneToday = useQuery({
    queryKey: ["faculty-done", me.userId, current?.id],
    enabled: !!me.userId && !!current,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("form_submissions")
        .select("form_id")
        .eq("submitted_by", me.userId!)
        .eq("class_timing_id", current!.id)
        .gte("created_at", start.toISOString());
      return new Set((data ?? []).map((d) => d.form_id));
    },
  });

  const studentCount = useQuery({
    queryKey: ["batch-students", current?.batch_id],
    enabled: !!current,
    queryFn: async () => {
      const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("batch_id", current!.batch_id);
      return count ?? 0;
    },
  });

  const mine = useQuery({
    queryKey: ["my-subs", me.userId],
    enabled: !!me.userId,
    queryFn: async () => {
      const { data } = await supabase.from("form_submissions").select(SUB_SELECT).eq("submitted_by", me.userId!).order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hello, ${me.profile?.full_name?.split(" ")[0] || "there"}`}
        description={`${DAYS[day]} · ${hhmm(t)} · ${ROLE_LABELS.faculty}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 border-primary/30 bg-primary p-5 text-primary-foreground lg:col-span-2">
          <p className="stat-label text-primary-foreground/70">Current class</p>
          {current ? (
            <>
              <h2 className="mt-2 font-display text-2xl font-semibold">{current.subject}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><p className="text-primary-foreground/60">Batch</p><p className="font-medium">{current.batches.code}</p></div>
                <div><p className="text-primary-foreground/60">Time</p><p className="font-medium">{hhmm(current.start_time)} – {hhmm(current.end_time)}</p></div>
                <div><p className="text-primary-foreground/60">Room</p><p className="font-medium">{current.room ?? "—"}</p></div>
                <div><p className="text-primary-foreground/60">Students</p><p className="font-medium">{studentCount.data ?? "—"}</p></div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-primary-foreground/80">
              No class in session right now.
              {upcoming[0] && ` Next: ${upcoming[0].subject} (${upcoming[0].batches.code}) at ${hhmm(upcoming[0].start_time)}.`}
            </p>
          )}
        </Card>

        <Card className="gap-0 p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">Today's schedule</h2>
          </div>
          <ul className="divide-y divide-border">
            {(today.data ?? []).map((c) => {
              const live = c.id === current?.id;
              const past = c.end_time <= t;
              return (
                <li key={c.id} className={`flex items-center gap-3 px-4 py-2.5 ${past ? "opacity-50" : ""}`}>
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-[11px] text-muted-foreground">{hhmm(c.start_time)}–{hhmm(c.end_time)}</span>
                  <span className="truncate text-sm font-medium">{c.batches.code}</span>
                  {live && <span className="ml-auto text-[11px] font-medium text-status-approved">Live</span>}
                </li>
              );
            })}
            {!today.data?.length && <li className="px-4 py-6 text-sm text-muted-foreground">No classes scheduled for you today.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">Tasks for this class</h2>
            <p className="text-xs text-muted-foreground">Forms configured by administration for the current batch.</p>
          </div>
          <ul className="divide-y divide-border">
            {current &&
              (tasks.data ?? []).map((f) => {
                const done = doneToday.data?.has(f.id);
                return (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">{f.name}</span>
                    {done ? (
                      <StatusBadge status="completed" />
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/fill/$formId" params={{ formId: f.id }} search={{ classId: current.id }}>
                          Open <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </li>
                );
              })}
            {!current && <li className="px-4 py-6 text-sm text-muted-foreground">Tasks appear automatically when your class starts.</li>}
            {current && !tasks.data?.length && <li className="px-4 py-6 text-sm text-muted-foreground">No forms configured for this class.</li>}
          </ul>
        </Card>

        <Card className="gap-0 p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-semibold">My submissions</h2>
            <Link to="/submissions" className="text-xs font-medium text-primary">View all</Link>
          </div>
          <SubmissionRows rows={mine.data ?? []} />
        </Card>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const me = useCurrentUser();
  const student = useQuery({
    queryKey: ["my-student", me.userId],
    enabled: !!me.userId,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("*, batches(id, code, name, course_id), courses(name)").eq("profile_id", me.userId!).maybeSingle();
      return data;
    },
  });
  const forms = useQuery({
    queryKey: ["student-forms", student.data?.batch_id],
    enabled: student.isFetched,
    queryFn: () =>
      fetchApplicableForms({ role: "student", batchId: student.data?.batch_id, courseId: student.data?.course_id }),
  });
  const mine = useQuery({
    queryKey: ["my-subs", me.userId],
    enabled: !!me.userId,
    queryFn: async () => {
      const { data } = await supabase.from("form_submissions").select(SUB_SELECT).eq("submitted_by", me.userId!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="space-y-5">
      <PageHeader title={`Welcome, ${me.profile?.full_name || "student"}`} description="Your batch, requests and their status." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="stat-label">My details</p>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline text-muted-foreground">Email: </dt><dd className="inline">{me.profile?.email}</dd></div>
            <div><dt className="inline text-muted-foreground">Roll no: </dt><dd className="inline">{student.data?.roll_no ?? "Not linked yet"}</dd></div>
            <div><dt className="inline text-muted-foreground">Batch: </dt><dd className="inline">{student.data?.batches?.code ?? "—"}</dd></div>
            <div><dt className="inline text-muted-foreground">Course: </dt><dd className="inline">{student.data?.courses?.name ?? "—"}</dd></div>
          </dl>
        </Card>
        <Card className="gap-0 p-0 lg:col-span-2">
          <div className="border-b border-border px-4 py-3"><h2 className="text-[15px] font-semibold">Requests I can submit</h2></div>
          <ul className="divide-y divide-border">
            {(forms.data ?? []).map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                <FileText className="size-4 text-muted-foreground" />
                <div className="flex-1"><p className="text-sm font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{f.description}</p></div>
                <Button asChild size="sm" variant="outline"><Link to="/fill/$formId" params={{ formId: f.id }} search={{ classId: undefined }}>Start</Link></Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="gap-0 p-0">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[15px] font-semibold">My requests</h2></div>
        <SubmissionRows rows={mine.data ?? []} />
      </Card>
    </div>
  );
}
