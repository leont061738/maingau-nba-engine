import type { CustomerNBA } from "@/data/mockData";

export type ProfilingState = "granted" | "not_given" | "withdrawn";

/** A customer as held by the demo store: the mockData shape plus explicit GDPR profiling state. */
export interface PoolCustomer extends CustomerNBA {
  /** Explicit profiling/analytics state; falls back to consents.profiling when absent. */
  profiling_analytics?: ProfilingState;
  /** Which non-personalized fallback the compliance guard applies when profiling is missing. */
  fallback_kind?: "notice" | "no_action";
}

export const PROFILING_FALLBACK_REASON =
  "Personalization blocked due to missing profiling consent. Fallback applied.";

export function profilingState(c: PoolCustomer): ProfilingState {
  if (c.profiling_analytics) return c.profiling_analytics;
  return c.consents.profiling ? "granted" : "withdrawn";
}

export function isProfilingBlocked(c: PoolCustomer) {
  return profilingState(c) !== "granted";
}

const FALLBACKS: Record<NonNullable<PoolCustomer["fallback_kind"]>, CustomerNBA["current_nba"]> = {
  notice: {
    product_id: "P-STD-01",
    product_name: "Unpersonalized Standard Service/Tariff Notice",
    action_type: "service",
    channel: "portal_popup",
    tone: "Sie",
    tone_confidence: 100,
    delta_clv_eur: 0,
    reason: PROFILING_FALLBACK_REASON,
    blocked_by_hard_rule: "Profiling consent missing (Art. 6 GDPR) — personalized offers blocked",
  },
  no_action: {
    product_id: "P-NONE-00",
    product_name: "No Action (Contact Fatigue Protected)",
    action_type: "service",
    channel: "portal_popup",
    tone: "Sie",
    tone_confidence: 100,
    delta_clv_eur: 0,
    reason: `${PROFILING_FALLBACK_REASON} Contact fatigue rule (max 1 contact / 30 days) blocks any outbound marketing.`,
    blocked_by_hard_rule: "Profiling consent missing (Art. 6 GDPR) — no action permitted",
  },
};

/** Compliance guard: no personalized/behavioral offer may survive for a customer without profiling consent. */
export function enforceProfiling(c: PoolCustomer): PoolCustomer {
  if (!isProfilingBlocked(c)) return c;
  const base = FALLBACKS[c.fallback_kind ?? "notice"];
  return {
    ...c,
    current_nba: {
      ...base,
      channel: c.consents.portal_app ? "portal_popup" : "email",
      tone: c.current_nba.tone,
      tone_confidence: c.current_nba.tone_confidence,
    },
  };
}

/* ---------------------------------- hypotheses --------------------------------- */

export interface Hypothesis {
  id: string;
  title: string;
  sample: number;
  uplift: number;
  significance: number;
  status: string;
  confirmed: boolean;
}

export const HYPO_H104: Hypothesis = {
  id: "H-104",
  title:
    "EV drivers with >3 public charges/month convert +22% higher to 'StromAktiv' when addressed in informal tone ('Du') via In-App Pop-up.",
  sample: 120,
  uplift: 18.4,
  significance: 96,
  status: "Confirmed & Integrated",
  confirmed: true,
};

export const HYPO_H105: Hypothesis = {
  id: "H-105",
  title:
    "Prosumers with feed-in meters adopt HEMS Starter-Set faster when offered an annual SaaS discount instead of a hardware discount.",
  sample: 45,
  uplift: 6.2,
  significance: 78,
  status: "Running (Exploration Phase)",
  confirmed: false,
};

/* --------------------------------- model state --------------------------------- */

export interface ModelState {
  clv: number;
  conversion: number;
  retrained: boolean;
  policyApplied: boolean;
  h105: Hypothesis;
}

export const BASE_MODEL: ModelState = {
  clv: 148250,
  conversion: 6.4,
  retrained: false,
  policyApplied: false,
  h105: HYPO_H105,
};

export const RETRAINED_CLV = 162400;
export const CONVERSION_GAIN_PP = 2.8;
export const BANDIT_DEFAULT_EXPLORATION = 10;

export const RETRAIN_STEPS = [
  "Collecting conversion events...",
  "Evaluating Uplift vs. Control Group...",
  "Re-calculating p(accept) in CLV model...",
  "Re-training Decision Policies...",
];

export function applyRetrain(m: ModelState): ModelState {
  return {
    ...m,
    clv: RETRAINED_CLV,
    conversion: Math.round((m.conversion + CONVERSION_GAIN_PP) * 10) / 10,
    retrained: true,
    h105: { ...m.h105, sample: m.h105.sample + 50, uplift: 8.4, significance: 93, status: "Validated", confirmed: true },
  };
}

export function applyPolicy(m: ModelState): ModelState {
  return { ...m, policyApplied: true };
}

/* ------------------------------- random sampling ------------------------------- */

export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/**
 * Picks `size` distinct customers. At least one customer without profiling consent is
 * always included so the compliance fallback is demonstrable in every sample.
 */
export function pickSample(pool: readonly PoolCustomer[], size = 5, rng: () => number = Math.random): PoolCustomer[] {
  const restricted = pool.filter(isProfilingBlocked);
  const rest = pool.filter((c) => !isProfilingBlocked(c));
  const out: PoolCustomer[] = [];
  const push = (c: PoolCustomer) => {
    if (out.length < size && !out.includes(c)) out.push(c);
  };
  for (const c of shuffle(restricted, rng)) push(c);
  for (const c of shuffle(rest, rng)) push(c);
  return out;
}
