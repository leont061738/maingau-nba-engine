import { useState } from "react";
import { RefreshCw, Play, Database, Radio, CheckCircle2, Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useNba, REPLAY_EVENTS } from "@/lib/nba-store";
import type { CustomerNBA, StreamEvent } from "@/data/mockData";
import { ActionBadge, channelMeta, eur } from "./shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  "Consuming OCPI/Webhook event...",
  "Re-evaluating eligibility...",
  "Recalculating CLV...",
  "Applying Hard Rules...",
  "Decision updated!",
];

function Side({ title, c, highlight }: { title: string; c: CustomerNBA; highlight?: boolean }) {
  const n = c.current_nba;
  const Ch = channelMeta[n.channel].icon;
  return (
    <div className={cn("flex-1 rounded-lg border p-4", highlight ? "border-accent bg-accent/10" : "bg-secondary")}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2 font-semibold">{n.product_name}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <ActionBadge type={n.action_type} />
        <span className="inline-flex items-center gap-1"><Ch className="h-3.5 w-3.5" />{channelMeta[n.channel].label}</span>
        <span>· {n.tone}</span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Churn {Math.round(c.churn_prob * 100)}% · Δ CLV +{eur(n.delta_clv_eur)}</div>
    </div>
  );
}

export function ReplayTab({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const { applyEvent, processed, resetAll, customers } = useNba();
  const [running, setRunning] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const play = async (evt: StreamEvent) => {
    setRunning(evt.event_id);
    setLog([`[${evt.timestamp}] ${evt.event_id} → ${evt.customer_id} · ${evt.event_type}`]);
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 650));
      setLog((l) => [...l, STEPS[i] ?? ""]);
    }
    applyEvent(evt);
    setRunning(null);
    toast.success("NBA decision updated", { description: `${evt.customer_id}: ${evt.nba_after_event.product_name}` });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-navy p-6 text-navy-foreground shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent"><Radio className="h-4 w-4" />Deep Dive B</div>
        <h2 className="mt-2 text-2xl font-bold">Event Stream Replay</h2>
        <p className="mt-2 max-w-3xl text-sm text-navy-muted">
          MAINGAU connects Databricks Structured Streaming with Delta Live Tables to consume asynchronous customer signals —
          grid operator messages, OCPI charging sessions, consent webhooks — and re-scores the Next Best Action in near-real-time.
          Hard rules and GDPR consent are re-applied before any decision reaches a channel.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {["Kafka / Webhooks", "Bronze (raw)", "Silver (DLT)", "Gold · Feature Store", "NBA Scoring"].map((s, i, a) => (
            <span key={s} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-navy-muted/30 px-3 py-1"><Database className="h-3 w-3 text-accent" />{s}</span>
              {i < a.length - 1 && <ArrowRight className="h-3 w-3 text-navy-muted" />}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Replay Console</h3>
            <Button size="sm" variant="ghost" disabled={!!running} onClick={() => { resetAll(); setLog([]); toast("State reset to initial snapshot"); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
          {REPLAY_EVENTS.map((evt, idx) => {
            const done = processed[evt.event_id];
            const isRunning = running === evt.event_id;
            const cust = customers.find((c) => c.customer_id === evt.customer_id);
            return (
              <div key={evt.event_id} className={cn("rounded-xl border bg-card p-5 shadow-card transition", isRunning && "shadow-glow")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-primary px-2 py-0.5 font-mono text-primary-foreground">Event {idx + 1}</span>
                      <span className="font-mono text-muted-foreground">{evt.event_id} · {evt.timestamp}</span>
                    </div>
                    <div className="mt-2 font-semibold">
                      {evt.event_type.replace(/_/g, " ")} ·{" "}
                      <button className="font-mono text-chart-2 underline-offset-2 hover:underline" onClick={() => onOpenCustomer(evt.customer_id)}>
                        {evt.customer_id}
                      </button>{" "}
                      <span className="font-normal text-muted-foreground">({cust?.name})</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{evt.description}</p>
                    <p className="mt-1 text-sm font-medium">{evt.impact_description}</p>
                  </div>
                  <Button
                    disabled={!!running || !!done}
                    onClick={() => play(evt)}
                    className={done ? "" : "bg-gradient-amber font-semibold text-accent-foreground hover:opacity-90"}
                    variant={done ? "secondary" : "default"}
                  >
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isRunning ? "Processing" : done ? "Applied" : "Play Event"}
                  </Button>
                </div>
                {isRunning && (
                  <div className="mt-4 flex gap-1">
                    {STEPS.map((_, i) => (
                      <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all", i <= step ? "bg-accent" : "bg-secondary")} />
                    ))}
                  </div>
                )}
                {done && (
                  <div className="mt-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center animate-in fade-in slide-in-from-bottom-2">
                    <Side title="Before" c={done.before} />
                    <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-accent md:rotate-0" />
                    <Side title="After" c={done.after} highlight />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="h-fit rounded-xl border bg-navy p-4 font-mono text-xs text-navy-foreground shadow-card lg:sticky lg:top-24">
          <div className="mb-3 flex items-center gap-2 text-navy-muted">
            <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin text-accent")} /> live processing log
          </div>
          <div className="min-h-64 space-y-1.5">
            {log.length === 0 && <div className="text-navy-muted">Waiting for events… press "Play Event".</div>}
            {log.map((l, i) => (
              <div key={i} className={cn("animate-in fade-in slide-in-from-left-1", l === "Decision updated!" ? "text-success" : i === 0 ? "text-accent" : "")}>
                <span className="text-navy-muted">›</span> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
