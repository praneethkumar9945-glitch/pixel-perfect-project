import type { ReactNode } from "react";
import { Search, Inbox, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-md border border-border bg-card shadow-xs", className)}>{children}</div>;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">{children}</div>;
}

export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 pl-8" />
    </div>
  );
}

export function NativeSelect({ value, onChange, children, className }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      {children}
    </select>
  );
}

export function Field({ label, children, hint, required }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Empty({ text = "No records found" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
      <Inbox className="size-8 opacity-40" />
      {text}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-12 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

/** Dense Zoho-style data table. */
export function DataTable<T>({
  rows,
  columns,
  loading,
  empty,
  rowKey,
}: {
  rows: T[] | undefined;
  columns: { header: string; cell: (r: T) => ReactNode; className?: string }[];
  loading?: boolean;
  empty?: string;
  rowKey: (r: T) => string;
}) {
  if (loading) return <Loading />;
  if (!rows?.length) return <Empty {...(empty ? { text: empty } : {})} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60 text-left">
            {columns.map((c) => (
              <th key={c.header} className={cn("whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-accent/40">
              {columns.map((c) => (
                <td key={c.header} className={cn("px-3 py-2 align-middle", c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivePill({ active }: { active: boolean }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-bold", active ? "bg-status-approved-bg text-status-approved" : "bg-status-draft-bg text-status-draft")}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";
}
