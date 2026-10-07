import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/AppShell";
import { Panel, Toolbar, NativeSelect, DataTable } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubmissions } from "@/lib/submissions";
import { useBatches, downloadCsv } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — University Manager" }, { name: "description", content: "Submission statistics by status, form and batch." }] }),
  component: ReportsPage,
});

function group<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function ReportsPage() {
  const subs = useSubmissions();
  const batches = useBatches();
  const [batch, setBatch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows = (subs.data ?? []).filter((r) => (!batch || r.batch_id === batch) && (!from || r.created_at.slice(0, 10) >= from) && (!to || r.created_at.slice(0, 10) <= to));
  const byStatus = group(rows, (r) => STATUS_LABELS[r.status] ?? r.status);
  const byForm = group(rows, (r) => r.forms?.name ?? "—");
  const byBatch = group(rows, (r) => r.batches?.code ?? "No batch");

  const Chart = ({ data }: { data: { name: string; count: number }[] }) => (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]} /></BarChart>
    </ResponsiveContainer>
  );

  return (
    <div>
      <PageHeader title="Reports" description={`${rows.length} submissions in view`} action={<Button size="sm" variant="outline" onClick={() => downloadCsv("report.csv", byForm.map((x) => ({ form: x.name, submissions: x.count })))}><Download /> Export</Button>} />
      <Panel className="mb-4">
        <Toolbar>
          <NativeSelect value={batch} onChange={setBatch}><option value="">All batches</option>{batches.data?.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</NativeSelect>
          <Input type="date" className="h-8 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-xs">to</span>
          <Input type="date" className="h-8 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </Toolbar>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4"><h2 className="mb-2 text-sm font-bold">By status</h2><Chart data={byStatus} /></Panel>
        <Panel className="p-4"><h2 className="mb-2 text-sm font-bold">By batch</h2><Chart data={byBatch} /></Panel>
        <Panel className="lg:col-span-2"><div className="px-4 pt-3 text-sm font-bold">By form</div>
          <DataTable rows={byForm} loading={subs.isLoading} rowKey={(r) => r.name} columns={[{ header: "Form", cell: (r) => r.name }, { header: "Submissions", cell: (r) => r.count }]} />
        </Panel>
      </div>
    </div>
  );
}
