import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  CalendarRange,
  FileText,
  CheckCircle2,
  BarChart3,
  ScrollText,
  Bell,
  LogOut,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import type { ReactNode } from "react";
import { ROLE_LABELS, useCurrentUser, useSignOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, primaryRole, isStaff, isHod, isFaculty, userId } = useCurrentUser();
  const signOut = useSignOut();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unread = useQuery({
    queryKey: ["unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  const main: NavItem[] = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
  const admin: NavItem[] = [
    { to: "/students", label: "Students", icon: GraduationCap },
    { to: "/people", label: "Faculty & HODs", icon: Users },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/batches", label: "Batches", icon: Layers },
    { to: "/timetable", label: "Timetable", icon: CalendarRange },
    { to: "/forms", label: "Form builder", icon: FileText },
  ];
  const work: NavItem[] = [
    { to: "/submissions", label: "Submissions", icon: Inbox },
    { to: "/approvals", label: "Approvals", icon: CheckCircle2 },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ];
  const insight: NavItem[] = [
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/audit", label: "Audit log", icon: ScrollText },
  ];

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function Section({ title, items }: { title: string; items: NavItem[] }) {
    return (
      <div className="mt-4 first:mt-0">
        <p className="stat-label px-3 pb-1.5">{title}</p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.to === "/notifications" && (unread.data ?? 0) > 0 && (
                  <span className="ml-auto rounded-full bg-status-pending-bg px-1.5 py-0.5 font-mono text-[10px] text-status-pending">
                    {unread.data}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <div className="grid size-9 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
            UM
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">University Manager</p>
            <p className="stat-label">Administration</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <Section title="Overview" items={main} />
          {(isStaff || isHod) && (
            <Section title="Administration" items={isStaff ? admin : admin.slice(0, 5)} />
          )}
          <Section title="Workflow" items={work} />
          {(isStaff || isHod) && <Section title="Insight" items={insight} />}
          {isStaff && (
            <Section
              title="System"
              items={[{ to: "/users", label: "Users & roles", icon: ShieldCheck }]}
            />
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-display text-xs font-semibold text-accent-foreground">
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold">
                {profile?.full_name || profile?.email}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {primaryRole ? ROLE_LABELS[primaryRole] : "No role"}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-6">
          <Link to="/dashboard" className="font-display text-sm font-semibold lg:hidden">
            University Manager
          </Link>
          <p className="hidden text-sm text-muted-foreground lg:block">
            {isFaculty && !isStaff ? "Faculty workspace" : "Console"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="size-4" />
              {(unread.data ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 py-0.5 font-mono text-[10px] leading-none text-destructive-foreground">
                  {unread.data}
                </span>
              )}
            </Link>
            <button
              onClick={signOut}
              className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 lg:hidden">
          {[...main, ...(isStaff ? admin : []), ...work].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
