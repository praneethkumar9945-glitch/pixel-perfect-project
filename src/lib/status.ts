import type { Database } from "@/integrations/supabase/types";

export type SubmissionStatus = Database["public"]["Enums"]["submission_status"];

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  hod_approved: "HOD approved",
  admin_approved: "Admin approved",
  rejected: "Rejected",
  returned: "Returned",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function statusClasses(status: SubmissionStatus | string): string {
  switch (status) {
    case "completed":
    case "admin_approved":
    case "hod_approved":
    case "active":
      return "bg-status-approved-bg text-status-approved";
    case "rejected":
    case "cancelled":
      return "bg-status-rejected-bg text-status-rejected";
    case "submitted":
    case "returned":
      return "bg-status-pending-bg text-status-pending";
    case "under_review":
      return "bg-status-review-bg text-status-review";
    default:
      return "bg-status-draft-bg text-status-draft";
  }
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function hhmm(time: string | null | undefined) {
  if (!time) return "";
  return time.slice(0, 5);
}
