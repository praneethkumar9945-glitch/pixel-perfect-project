import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("code");
      if (error) throw error;
      return data;
    },
  });
}

export function useBatches() {
  return useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select("*, courses(code,name), batch_faculty(faculty_id)")
        .order("code");
      if (error) throw error;
      return data;
    },
  });
}

/** People holding a given role (staff/HOD/faculty can read). */
export function usePeopleByRole(role: AppRole | AppRole[]) {
  const roles = Array.isArray(role) ? role : [role];
  return useQuery({
    queryKey: ["people", roles.join(",")],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", roles);
      if (error) throw error;
      const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
      if (!ids.length) return [];
      const { data: profs, error: e2 } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids)
        .order("full_name");
      if (e2) throw e2;
      return (profs ?? []).map((p) => ({
        ...p,
        roles: (rows ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      }));
    },
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function nameOf(
  list: { id: string; full_name: string; email: string }[] | undefined,
  id: string | null | undefined,
) {
  if (!id) return "—";
  const p = list?.find((x) => x.id === id);
  return p ? p.full_name || p.email : "—";
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Schedule engine: classes for a faculty member on a weekday, only for active batches. */
export async function fetchFacultyDay(facultyId: string, day: number) {
  const { data, error } = await supabase
    .from("class_timings")
    .select("*, batches!inner(id, code, name, status, course_id, hod_id)")
    .eq("faculty_id", facultyId)
    .eq("day_of_week", day)
    .eq("is_active", true)
    .eq("batches.status", "active")
    .order("start_time");
  if (error) throw error;
  return data ?? [];
}

/** Rule engine: forms that apply to a role + batch/course/faculty context today. */
export async function fetchApplicableForms(ctx: {
  role: AppRole;
  batchId?: string | null | undefined;
  courseId?: string | null | undefined;
  facultyId?: string | null | undefined;
}) {
  const { data: forms, error } = await supabase
    .from("forms")
    .select("*, form_rules(*)")
    .eq("is_active", true)
    .contains("target_roles", [ctx.role])
    .order("name");
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  return (forms ?? []).filter((f) => {
    const rules = (f.form_rules ?? []).filter((r) => r.is_active);
    if (!rules.length) return ctx.role !== "faculty"; // faculty only see explicitly ruled forms
    return rules.some(
      (r) =>
        (!r.batch_id || r.batch_id === ctx.batchId) &&
        (!r.course_id || r.course_id === ctx.courseId) &&
        (!r.faculty_id || r.faculty_id === ctx.facultyId) &&
        (!r.valid_from || r.valid_from <= today) &&
        (!r.valid_to || r.valid_to >= today),
    );
  });
}

export function nowHHMM(d = new Date()) {
  return d.toTimeString().slice(0, 8);
}
