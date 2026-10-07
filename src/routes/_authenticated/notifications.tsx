import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Panel, Loading, Empty } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — University Manager" }, { name: "description", content: "Your alerts about requests and approvals." }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const nav = useNavigate();
  const list = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId!).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const mark = useMutation({
    mutationFn: async (id?: string) => {
      let qy = supabase.from("notifications").update({ is_read: true }).eq("user_id", userId!);
      if (id) qy = qy.eq("id", id);
      const { error } = await qy;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unread = list.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Notifications" description={`${unread} unread`} action={unread > 0 && <Button size="sm" variant="outline" onClick={() => mark.mutate(undefined)}><CheckCheck /> Mark all read</Button>} />
      <Panel>
        {list.isLoading ? <Loading /> : !list.data?.length ? <Empty text="No notifications yet" /> : (
          <ul className="divide-y divide-border">
            {list.data.map((n) => (
              <li key={n.id}>
                <button className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-accent/40", !n.is_read && "bg-primary/5")} onClick={() => { mark.mutate(n.id); if (n.link) nav({ to: n.link }); }}>
                  <Bell className={cn("mt-0.5 size-4 shrink-0", n.is_read ? "text-muted-foreground" : "text-primary")} />
                  <div className="flex-1">
                    <div className={cn("text-sm", !n.is_read && "font-bold")}>{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
