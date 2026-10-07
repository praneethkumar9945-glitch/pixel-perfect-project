import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SUB_SELECT = "*, forms(code, name, workflow_steps), batches(code), students(full_name, roll_no)";

/** All submissions the signed-in user may see (RLS decides). */
export function useSubmissions() {
  return useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("form_submissions").select(SUB_SELECT).order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });
}

export const OPEN_STATUSES = ["submitted", "under_review", "hod_approved"];
