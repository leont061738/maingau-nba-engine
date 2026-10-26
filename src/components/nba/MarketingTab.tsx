import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Euro, Users, PieChart, ShieldCheck, ShieldAlert, Send, Layers, ArrowRight } from "lucide-react";
import { useNba } from "@/lib/nba-store";
import { ActionBadge, ChannelBadge, ComplianceBadge, eur, primarySegment } from "./shared";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const LINES = ["All", "Strom", "Gas", "Mobilfunk", "Autostrom"];
const ACTIONS = ["All", "Sales", "Retention", "Service-Only"];
const RISK = ["All", "No Dunning", "Dunning / Complaint"];

function Seg({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              value === o ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MarketingTab({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const { customers, recentlyUpdated } = useNba();
  const [line, setLine] = useState("All");
  const [action, setAction] = useState("All");
  const [risk, setRisk] = useState("All");
  const [fatigue, setFatigue] = useState(true);
  const [approved, setApproved] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      customers.filter((c) => {
        if (line !== "All" && !c.active_lines.includes(line)) return false;
        const t = c.current_nba.action_type;
        if (action === "Sales" && !(t === "sales" || t === "upsell")) return false;
        if (action === "Retention" && t !== "retention") return false;
        if (action === "Service-Only" && t !== "service") return false;
        const risky = c.dunning_level > 0 || c.has_open_complaint;
        if (risk === "No Dunning" && risky) return false;
        if (risk === "Dunning / Complaint" && !risky) return false;
        return true;
      }),
    [customers, line, action, risk],
  );

  const batches = [
    { id: "B-EMAIL", name: "E-Mail Batch · ESP", ch: "email" as const },
    { id: "B-PORTAL", name: "Portal Pop-up · Portal API", ch: "portal_popup" as const },
    { id: "B-AGENT", name: "Service Call Queue · CRM", ch: "agent_phone" as const },
  ].map((b) => ({ ...b, items: customers.filter((c) => c.current_nba.channel === b.ch) }));

  const kpis = [
    { label: "Total Potential Δ CLV", value: "€148,250", icon: Euro, hint: "Across synthetic pool" },
    { label: "Active Customers", value: "750", icon: Users, hint: "Synthetic pool" },
    { label: "Action Split", value: "42 / 35 / 23", icon: PieChart, hint: "Sales · Retention · Service %", split: true },
    { label: "Consent Compliance", value: "100%", icon: ShieldCheck, hint: "Strict GDPR enforcement" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <k.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-2 font-display text-3xl font-bold tracking-tight">{k.value}</div>
            {k.split ? (
              <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                <div className="bg-chart-2" style={{ width: "42%" }} />
                <div className="bg-accent" style={{ width: "35%" }} />
                <div className="bg-destructive" style={{ width: "23%" }} />
              </div>
            ) : null}
            <div className="mt-2 text-xs text-muted-foreground">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-6 rounded-xl border bg-card p-4 shadow-card">
        <Seg label="Business Line" value={line} options={LINES} onChange={setLine} />
        <Seg label="Action Type" value={action} options={ACTIONS} onChange={setAction} />
        <Seg label="Dunning / Risk" value={risk} options={RISK} onChange={setRisk} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-semibold">Campaign Matrix</h3>
            <span className="text-xs text-muted-foreground">{rows.length} of {customers.length} customers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Customer", "City", "Segment", "Recommended Action", "Channel", "Tone", "Δ CLV", "Compliance", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const flagged = c.customer_id === "MG-100004" || !!c.current_nba.blocked_by_hard_rule;
                  return (
                    <>
                      <tr
                        key={c.customer_id}
                        className={cn(
                          "border-t align-top transition",
                          flagged && "border-l-4 border-l-warning bg-warning/10",
                          recentlyUpdated === c.customer_id && "flash-update",
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">{c.customer_id}</td>
                        <td className="px-4 py-3">{c.city}</td>
                        <td className="px-4 py-3 text-muted-foreground">{primarySegment(c)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.current_nba.product_name}</div>
                          <div className="mt-1"><ActionBadge type={c.current_nba.action_type} /></div>
                        </td>
                        <td className="px-4 py-3"><ChannelBadge channel={c.current_nba.channel} /></td>
                        <td className="px-4 py-3 font-semibold">{c.current_nba.tone}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-display font-bold text-success">+{eur(c.current_nba.delta_clv_eur)}</td>
                        <td className="px-4 py-3"><ComplianceBadge blocked={c.current_nba.blocked_by_hard_rule} /></td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => onOpenCustomer(c.customer_id)}>
                            360° <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                      {flagged && (
                        <tr key={c.customer_id + "-warn"} className="border-l-4 border-l-warning bg-warning/10">
                          <td colSpan={9} className="px-4 pb-3 text-xs font-medium text-warning-foreground">
                            <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                            {c.customer_id === "MG-100004"
                              ? "Blocked: Open Complaint & Dunning 2 -> Service Action Enforced"
                              : `Blocked: ${c.current_nba.blocked_by_hard_rule} -> Service Action Enforced`}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No customers match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-fit rounded-xl border bg-card shadow-card">
          <div className="rounded-t-xl bg-gradient-navy px-5 py-4 text-navy-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
              <Layers className="h-4 w-4" /> Campaign Governance
            </div>
            <h3 className="mt-1 font-semibold">Human-in-the-loop Approval</h3>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="text-sm font-semibold">Contact fatigue rule</div>
                <div className="text-xs text-muted-foreground">Max 1 contact per 30 days per customer</div>
              </div>
              <Switch checked={fatigue} onCheckedChange={setFatigue} />
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Queued batches</div>
              {batches.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.items.length} contacts · +{eur(b.items.reduce((s, c) => s + c.current_nba.delta_clv_eur, 0))}
                    </div>
                  </div>
                  {approved.includes(b.id) ? (
                    <span className="text-xs font-semibold text-success">Pushed</span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">Pending</span>
                  )}
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-gradient-amber font-semibold text-accent-foreground hover:opacity-90"
              onClick={() => {
                setApproved(batches.map((b) => b.id));
                const n = batches.reduce((s, b) => s + b.items.length, 0);
                toast.success("Batches approved & pushed", {
                  description: `${n} contacts sent to ESP / Portal API${fatigue ? " · fatigue rule applied (1/30d)" : ""}.`,
                });
              }}
            >
              <Send className="h-4 w-4" /> Approve & Push to ESP / Portal API
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
