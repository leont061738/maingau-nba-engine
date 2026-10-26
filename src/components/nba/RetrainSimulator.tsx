import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, PlayCircle, CheckCircle2, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNba } from "@/lib/nba-store";
import { CONVERSION_GAIN_PP, RETRAIN_STEPS, RETRAINED_CLV } from "@/lib/pitch";
import { cn } from "@/lib/utils";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function RetrainSimulator() {
  const { model, retrain, approvePolicy } = useNba();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);

  const run = async () => {
    if (running || model.retrained) return;
    setRunning(true);
    for (let i = 0; i < RETRAIN_STEPS.length; i++) {
      setStep(i);
      await wait(750);
    }
    retrain();
    setRunning(false);
    setStep(-1);
    toast.success("Model re-trained on 50 responses", {
      description: "Uplift validated vs. control group — awaiting marketer approval (human-in-the-loop).",
    });
  };

  const approve = () => {
    approvePolicy();
    toast.success("Compliant with Slide 12: Model re-trained, policy approved by marketer.");
  };

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Closed-Loop Learning</div>
          <h3 className="font-semibold">Decisioning &amp; Re-Training Simulator</h3>
        </div>
        {model.retrained ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Model re-trained
          </span>
        ) : (
          <Button
            onClick={run}
            disabled={running}
            className="bg-gradient-amber font-semibold text-accent-foreground hover:opacity-90"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {running ? "Simulating..." : "Simulate 50 Customer Responses"}
          </Button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {running && (
          <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 animate-in fade-in slide-in-from-bottom-1">
            <Progress value={((step + 1) / RETRAIN_STEPS.length) * 100} className="h-1.5 bg-secondary" />
            <ul className="mt-3 space-y-1.5 font-mono text-xs">
              {RETRAIN_STEPS.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    i < step ? "text-success" : i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {i < step ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : i === step ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                  )}
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!model.retrained && !running && (
          <p className="text-sm text-muted-foreground">
            Simulated conversion events are compared against the control group, the CLV model re-scores
            p(accept), and the decision policies are re-fitted — the loop only closes once a marketer approves the
            new policy.
          </p>
        )}

        {model.retrained && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-secondary/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Δ CLV</div>
                <div className="font-display text-xl font-bold text-success">
                  €{model.clv.toLocaleString("en-US")}
                </div>
                <div className="text-[11px] text-muted-foreground">from €148,250 · +€{RETRAINED_CLV - 148250}</div>
              </div>
              <div className="rounded-lg border bg-secondary/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Conversion Rate</div>
                <div className="font-display text-xl font-bold text-success">{model.conversion.toFixed(1)}%</div>
                <div className="text-[11px] text-muted-foreground">+{CONVERSION_GAIN_PP.toFixed(1)} pp vs. control</div>
              </div>
              <div className="rounded-lg border bg-secondary/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Hypothesis H-105</div>
                <div className="font-display text-xl font-bold">{model.h105.status}</div>
                <div className="text-[11px] text-muted-foreground">
                  {model.h105.sample} customers · {model.h105.significance}% significance
                </div>
              </div>
            </div>

            {model.policyApplied ? (
              <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                New model policy approved and queued for the next send batch.
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3">
                <div className="flex items-start gap-2 text-sm">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                  <span className="font-medium text-warning-foreground">
                    Human-in-the-loop: the re-trained policy is not live until a marketer signs it off.
                  </span>
                </div>
                <Button onClick={approve} className="bg-gradient-amber font-semibold text-accent-foreground hover:opacity-90">
                  <ShieldCheck className="h-4 w-4" /> Marketing Approval: Apply New Model Policy to Next Send Batch
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
