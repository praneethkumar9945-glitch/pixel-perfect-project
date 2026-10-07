import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, Loading, errMsg } from "@/components/kit";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SUB_SELECT } from "@/lib/submissions";
import { useAllProfiles, nameOf } from "@/lib/data";
import { logAudit, useCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/submissions/$id")({
  head: () => ({ meta: [{ title: "Submission — University Manager" }, { name: "description", content: "Submission details, documents and approval history." }] }),
  component: SubmissionDetail,
});

function SubmissionDetail() {
  const { id } = Route.useParams();
  const { userId, isStaff, isHod, primaryRole } = useCurrentUser();
  const people = useAllProfiles();
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState("");

  const q = useQuery({
    queryKey: ["submission", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("form_submissions").select(SUB_SELECT).eq("id", id).single();
      if (error) throw error;
      const [fields, docs, actions] = await Promise.all([
        supabase.from("form_fields").select("field_key, label, sort_order").eq("form_id", data.form_id).order("sort_order"),
        supabase.from("documents").select("*").eq("submission_id", id),
        supabase.from("workflow_actions").select("*").eq("submission_id", id).order("created_at"),
      ]);
      return { sub: data, fields: fields.data ?? [], docs: docs.data ?? [], actions: actions.data ?? [] };
    },
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["submission", id] }); qc.invalidateQueries({ queryKey: ["submissions"] }); };

  const review = useMutation({
    mutationFn: async (decision: "approve" | "return" | "reject") => {
      if (decision !== "approve" && !remarks.trim()) throw new Error("Remarks are required to return or reject");
      const { error } = await supabase.rpc("review_submission", { _id: id, _decision: decision, _remarks: remarks.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Decision recorded"); setRemarks(""); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const setStatus = useMutation({
    mutationFn: async (status: "submitted" | "cancelled") => {
      const { error } = await supabase.from("form_submissions").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit({ userId, role: primaryRole, action: status === "submitted" ? "submit form" : "cancel request", module: "submissions", recordId: q.data?.sub.reference_no });
    },
    onSuccess: () => { toast.success("Updated"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 120);
    if (error) return toast.error(errMsg(error));
    window.open(data.signedUrl, "_blank");
  }

  if (q.isLoading) return <Loading />;
  if (!q.data) return <PageHeader title="Submission not found" description="It may not exist or you don't have access." />;
  const { sub, fields, docs, actions } = q.data;
  const data = (sub.data ?? {}) as Record<string, unknown>;
  const label = (k: string) => fields.find((f) => f.field_key === k)?.label ?? k;
  const isOwner = sub.submitted_by === userId;
  const open = ["submitted", "under_review", "hod_approved"].includes(sub.status);
  const canReview = open && ((sub.current_step === "hod" && isHod) || (sub.current_step === "admin" && isStaff));
  const fmt = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "") || "—");

  return (
    <div className="max-w-4xl">
      <Link to="/submissions" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="size-3" /> All submissions</Link>
      <PageHeader title={sub.forms?.name ?? "Submission"} description={`${sub.reference_no} · submitted by ${nameOf(people.data, sub.submitted_by)} · ${new Date(sub.created_at).toLocaleString()}`} action={<StatusBadge status={sub.status} />} />
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-bold">Details</h2>
            <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Batch</dt><dd>{sub.batches?.code ?? "—"}</dd>
              <dt className="text-muted-foreground">Student</dt><dd>{sub.students ? `${sub.students.roll_no} · ${sub.students.full_name}` : "—"}</dd>
              {Object.entries(data).map(([k, v]) => <><dt key={k} className="text-muted-foreground">{label(k)}</dt><dd key={`${k}v`} className="whitespace-pre-wrap">{fmt(v)}</dd></>)}
            </dl>
          </Panel>
          {docs.length > 0 && (
            <Panel className="p-4">
              <h2 className="mb-3 text-sm font-bold">Documents</h2>
              {docs.map((d) => <button key={d.id} onClick={() => openDoc(d.storage_path)} className="flex items-center gap-2 py-1 text-sm text-primary hover:underline"><FileDown className="size-4" />{d.file_name} <span className="text-xs text-muted-foreground">{d.file_size ? `${Math.round(d.file_size / 1024)} KB` : ""}</span></button>)}
            </Panel>
          )}
          {canReview && (
            <Panel className="space-y-3 p-4">
              <h2 className="text-sm font-bold">Your decision ({sub.current_step?.toUpperCase()} step)</h2>
              <Textarea placeholder="Remarks (required to return or reject)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              <div className="flex gap-2">
                <Button disabled={review.isPending} onClick={() => review.mutate("approve")}>Approve</Button>
                <Button variant="outline" disabled={review.isPending} onClick={() => review.mutate("return")}>Return for changes</Button>
                <Button variant="destructive" disabled={review.isPending} onClick={() => review.mutate("reject")}>Reject</Button>
              </div>
            </Panel>
          )}
          {isOwner && (sub.status === "draft" || sub.status === "returned" || open) && (
            <div className="flex gap-2">
              {(sub.status === "draft" || sub.status === "returned") && <Button onClick={() => setStatus.mutate("submitted")} disabled={setStatus.isPending}>Submit now</Button>}
              <Button variant="outline" onClick={() => confirm("Cancel this request?") && setStatus.mutate("cancelled")} disabled={setStatus.isPending}>Cancel request</Button>
            </div>
          )}
        </div>
        <Panel className="h-fit p-4">
          <h2 className="mb-3 text-sm font-bold">History</h2>
          <ol className="space-y-3 border-l border-border pl-4 text-sm">
            <li><div className="font-bold">Created</div><div className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleString()}</div></li>
            {actions.map((a) => (
              <li key={a.id}>
                <div className="font-bold capitalize">{a.action.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">{nameOf(people.data, a.actor_id)} {a.actor_role ? `(${a.actor_role})` : ""} · {new Date(a.created_at).toLocaleString()}</div>
                {a.remarks && <div className="mt-1 rounded bg-muted px-2 py-1 text-xs">{a.remarks}</div>}
              </li>
            ))}
            {sub.current_step && open && <li className="text-muted-foreground">Waiting on {sub.current_step.toUpperCase()}</li>}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
