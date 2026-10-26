import { describe, it, expect } from "vitest";
import { POOL, POOL_BY_ID } from "@/data/pitchPool";
import { applyEventToCustomer } from "@/lib/nba-store";
import { REPLAY_EVENTS } from "@/data/mockData";
import {
  applyPolicy,
  applyRetrain,
  BASE_MODEL,
  enforceProfiling,
  isProfilingBlocked,
  pickSample,
  profilingState,
  RETRAINED_CLV,
} from "@/lib/pitch";

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length] ?? 0.5;
};

describe("customer randomizer", () => {
  it("picks 5 distinct customers and always includes a profiling-restricted profile", () => {
    const sample = pickSample(POOL, 5, seq([0.9, 0.1, 0.7, 0.3, 0.5, 0.2, 0.8, 0.4]));
    expect(sample).toHaveLength(5);
    expect(new Set(sample.map((c) => c.customer_id)).size).toBe(5);
    expect(sample.some((c) => isProfilingBlocked(c))).toBe(true);
  });

  it("pool covers the consent edge cases and the required archetypes", () => {
    expect(POOL.some((c) => profilingState(c) === "not_given")).toBe(true);
    expect(POOL.some((c) => profilingState(c) === "withdrawn")).toBe(true);
    expect(POOL.some((c) => c.dunning_level > 0 && c.current_nba.action_type === "service")).toBe(true);
    expect(POOL.some((c) => c.current_nba.action_type === "retention")).toBe(true);
    expect(POOL.some((c) => c.name === "Tobias Rauch" && c.current_nba.product_id === "P-SL-01")).toBe(true);
    expect(POOL.some((c) => c.active_lines.includes("Autostrom") && c.current_nba.action_type === "sales")).toBe(true);
  });

  it("never shows a personalized offer for a customer without profiling consent", () => {
    for (const c of POOL.filter(isProfilingBlocked)) {
      expect(["Unpersonalized Standard Service/Tariff Notice", "No Action (Contact Fatigue Protected)"]).toContain(
        c.current_nba.product_name,
      );
      expect(c.current_nba.reason).toContain(
        "Personalization blocked due to missing profiling consent. Fallback applied.",
      );
      expect(c.current_nba.delta_clv_eur).toBe(0);
    }
  });

  it("a stream event cannot reintroduce a personalized offer for a restricted customer", () => {
    const restricted = POOL_BY_ID.get("MG-100418")!;
    const after = enforceProfiling(applyEventToCustomer(restricted, REPLAY_EVENTS.find((e) => e.event_id === "EVT-9003")!));
    expect(after.current_nba.product_name).toBe("Unpersonalized Standard Service/Tariff Notice");
    expect(after.current_nba.product_id).toBe("P-STD-01");
    expect(after.current_nba.action_type).toBe("service");
  });

  it("leaves customers with profiling consent untouched", () => {
    const ok = POOL_BY_ID.get("MG-100027")!;
    expect(enforceProfiling(ok)).toBe(ok);
  });
});

describe("closed-loop re-training", () => {
  it("moves the global KPIs to the post-retrain figures", () => {
    const m = applyRetrain(BASE_MODEL);
    expect(m.clv).toBe(RETRAINED_CLV);
    expect(m.clv).toBe(162400);
    expect(m.conversion).toBe(9.2);
    expect(m.h105.status).toBe("Validated");
    expect(m.h105.confirmed).toBe(true);
    expect(m.retrained).toBe(true);
  });

  it("keeps the policy off until a marketer approves it", () => {
    const retrained = applyRetrain(BASE_MODEL);
    expect(retrained.policyApplied).toBe(false);
    expect(applyPolicy(retrained).policyApplied).toBe(true);
  });
});
