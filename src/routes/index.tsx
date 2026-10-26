import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Zap, LayoutDashboard, UserRound, RefreshCw } from "lucide-react";
import { NbaProvider, useNba } from "@/lib/nba-store";
import { MarketingTab } from "@/components/nba/MarketingTab";
import { CustomerTab } from "@/components/nba/CustomerTab";
import { ReplayTab } from "@/components/nba/ReplayTab";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MAINGAU NBA Engine · Next Best Action Prototype" },
      { name: "description", content: "Next Best Action engine prototype for MAINGAU Energie: campaign orchestration, Customer 360° agent assist and live event replay." },
      { property: "og:title", content: "MAINGAU NBA Engine" },
      { property: "og:description", content: "Real-time Next Best Action decisions by offer, channel and tone — consent-first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "marketing" | "customer" | "replay";
const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: "marketing", label: "Marketing Orchestration", icon: LayoutDashboard },
  { id: "customer", label: "Customer 360° / Agent Assist", icon: UserRound },
  { id: "replay", label: "Event Stream Replay (Deep Dive B)", icon: RefreshCw },
];

function Shell() {
  const [tab, setTab] = useState<Tab>("marketing");
  const { setSelectedId, processed } = useNba();
  const open = (id: string) => { setSelectedId(id); setTab("customer"); };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-gradient-navy text-navy-foreground shadow-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-amber">
              <Zap className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight">MAINGAU <span className="text-accent">NBA Engine</span></div>
              <div className="text-xs text-navy-muted">Strom · Gas · Mobilfunk · Internet · Autostrom · Smart Living</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-navy-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Stream live · {Object.keys(processed).length} events applied
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition",
                tab === t.id ? "border-accent text-navy-foreground" : "border-transparent text-navy-muted hover:text-navy-foreground",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main key={tab} className="mx-auto max-w-7xl px-6 py-8 animate-in fade-in slide-in-from-bottom-1 duration-300">
        {tab === "marketing" && <MarketingTab onOpenCustomer={open} />}
        {tab === "customer" && <CustomerTab />}
        {tab === "replay" && <ReplayTab onOpenCustomer={open} />}
      </main>
    </div>
  );
}

function Index() {
  return (
    <NbaProvider>
      <Shell />
      <Toaster richColors position="top-right" />
    </NbaProvider>
  );
}
