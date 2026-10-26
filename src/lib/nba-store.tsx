import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { INITIAL_CUSTOMERS, REPLAY_EVENTS, type CustomerNBA, type StreamEvent } from "@/data/mockData";

export type Feedback = { customer_id: string; action: string; at: string; note?: string };

interface Store {
  customers: CustomerNBA[];
  processed: Record<string, { before: CustomerNBA; after: CustomerNBA }>;
  feedback: Feedback[];
  recentlyUpdated: string | null;
  selectedId: string;
  setSelectedId: (id: string) => void;
  applyEvent: (evt: StreamEvent) => void;
  resetAll: () => void;
  logFeedback: (f: Omit<Feedback, "at">) => void;
}

const Ctx = createContext<Store | null>(null);

/** Pure state transition: applies a stream event to a customer. */
export function applyEventToCustomer(c: CustomerNBA, evt: StreamEvent): CustomerNBA {
  const next: CustomerNBA = {
    ...c,
    churn_prob: evt.churn_after_event,
    current_nba: { ...evt.nba_after_event },
    consents: { ...c.consents },
    active_lines: [...c.active_lines],
    churn_drivers: [...c.churn_drivers.filter((d) => !d.startsWith("Keine"))],
  };
  if (evt.event_type === "consent_withdrawn") {
    next.consents.marketing_email = false;
    next.churn_drivers.push("E-Mail-Opt-out");
  }
  if (evt.event_type === "gas_meter_deregistered") {
    next.active_lines = next.active_lines.filter((l) => l !== "Gas");
    next.churn_drivers.push("Gaszähler stillgelegt");
  }
  if (evt.event_type === "charge_failed_third_time") {
    next.churn_drivers = ["3 fehlgeschlagene Ladungen (14 Tage)"];
  }
  if (evt.event_type === "complaint_created") next.has_open_complaint = true;
  return next;
}

export function NbaProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<CustomerNBA[]>(INITIAL_CUSTOMERS);
  const [processed, setProcessed] = useState<Store["processed"]>({});
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(INITIAL_CUSTOMERS[0]?.customer_id ?? "");

  const applyEvent = useCallback((evt: StreamEvent) => {
    setCustomers((prev) => {
      const before = prev.find((c) => c.customer_id === evt.customer_id);
      if (!before) return prev;
      const after = applyEventToCustomer(before, evt);
      setProcessed((p) => ({ ...p, [evt.event_id]: { before, after } }));
      return prev.map((c) => (c.customer_id === evt.customer_id ? after : c));
    });
    setRecentlyUpdated(evt.customer_id);
    setTimeout(() => setRecentlyUpdated(null), 2500);
  }, []);

  const resetAll = useCallback(() => {
    setCustomers(INITIAL_CUSTOMERS);
    setProcessed({});
  }, []);

  const logFeedback = useCallback((f: Omit<Feedback, "at">) => {
    setFeedback((prev) => [{ ...f, at: new Date().toLocaleTimeString("de-DE") }, ...prev]);
  }, []);

  return (
    <Ctx.Provider
      value={{ customers, processed, feedback, recentlyUpdated, selectedId, setSelectedId, applyEvent, resetAll, logFeedback }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useNba() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNba must be used inside NbaProvider");
  return v;
}

export { REPLAY_EVENTS };
