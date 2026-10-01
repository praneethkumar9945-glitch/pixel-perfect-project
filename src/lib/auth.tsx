import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrative Staff",
  hod: "Head of Department",
  faculty: "Faculty",
  student: "Student",
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useCurrentUser() {
  const { session, loading } = useSession();
  const userId = session?.user.id;

  const profile = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      return {
        profile: prof,
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  const roles = profile.data?.roles ?? [];
  const primaryRole: AppRole | undefined =
    (["super_admin", "admin", "hod", "faculty", "student"] as AppRole[]).find((r) =>
      roles.includes(r),
    ) ?? undefined;

  return {
    session,
    userId,
    loading: loading || profile.isLoading,
    profile: profile.data?.profile ?? null,
    roles,
    primaryRole,
    isStaff: roles.includes("super_admin") || roles.includes("admin"),
    isHod: roles.includes("hod"),
    isFaculty: roles.includes("faculty"),
    isStudent: roles.includes("student"),
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };
}

export async function logAudit(input: {
  userId: string | undefined;
  role: string | undefined;
  action: string;
  module: string;
  recordId?: string;
  details?: Record<string, unknown>;
}) {
  if (!input.userId) return;
  await supabase.from("audit_logs").insert({
    user_id: input.userId,
    user_role: input.role ?? null,
    action: input.action,
    module: input.module,
    record_id: input.recordId ?? null,
    details: (input.details ?? null) as never,
  });
}
