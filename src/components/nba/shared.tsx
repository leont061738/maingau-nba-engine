import { Mail, MonitorSmartphone, Phone, BellRing, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CustomerNBA } from "@/data/mockData";
import { cn } from "@/lib/utils";

type Nba = CustomerNBA["current_nba"];

export const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const channelMeta: Record<Nba["channel"], { label: string; icon: typeof Mail }> = {
  email: { label: "E-Mail", icon: Mail },
  portal_popup: { label: "Portal Pop-up", icon: MonitorSmartphone },
  agent_phone: { label: "Service Call", icon: Phone },
  app_push: { label: "App Push", icon: BellRing },
};

export const actionMeta: Record<Nba["action_type"], { label: string; cls: string }> = {
  sales: { label: "Sales", cls: "bg-chart-2/10 text-chart-2 border-chart-2/30" },
  upsell: { label: "Upsell", cls: "bg-chart-2/10 text-chart-2 border-chart-2/30" },
  retention: { label: "Retention", cls: "bg-accent/15 text-warning-foreground border-accent/40" },
  service: { label: "Service-Only", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function ChannelBadge({ channel }: { channel: Nba["channel"] }) {
  const m = channelMeta[channel];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-medium">
      <Icon className="h-3.5 w-3.5" /> {m.label}
    </span>
  );
}

export function ActionBadge({ type }: { type: Nba["action_type"] }) {
  const m = actionMeta[type];
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", m.cls)}>{m.label}</span>
  );
}

export function ComplianceBadge({ blocked }: { blocked?: string }) {
  return blocked ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
      <ShieldAlert className="h-3.5 w-3.5" /> Hard Rule Blocked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-semibold text-success-foreground">
      <ShieldCheck className="h-3.5 w-3.5" /> Eligible
    </span>
  );
}

export function churnTone(p: number) {
  if (p < 0.15) return { bar: "bg-success", text: "text-success" };
  if (p <= 0.25) return { bar: "bg-warning", text: "text-warning-foreground" };
  return { bar: "bg-destructive", text: "text-destructive" };
}

export function primarySegment(c: CustomerNBA) {
  if (c.active_lines.length > 1) return "Multi-Product";
  return c.active_lines[0] ?? "—";
}
