import { createServerClient } from "./lib/supabase";
import BriefingCard from "./components/BriefingCard";
import SummaryBar from "./components/SummaryBar";
import UploadAnalyzer from "./components/UploadAnalyzer";
import dynamic from "next/dynamic";
import type { Briefing } from "./lib/api";
import type { Metadata } from "next";

const ChartPanel = dynamic(() => import("./components/ChartPanel"), {
  ssr: false,
  loading: () => (
    <div className="mt-8 space-y-4">
      <div className="h-5 w-32 skeleton" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => <div key={i} className="h-52 skeleton" />)}
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Fleet Briefing — Dashboard Operativo",
  description: "Briefings diarios de flota VTC generados con DeepSeek AI",
};

export const revalidate = 300;

interface Props { searchParams: { date?: string }; }

async function getDates(): Promise<string[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("briefings").select("date").order("date", { ascending: false }).limit(35);
    return [...new Set((data || []).map((r: any) => r.date as string))].slice(0, 7);
  } catch { return []; }
}

async function getBriefings(date: string): Promise<Briefing[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("briefings").select("*").eq("date", date).order("city");
  if (error) throw new Error(error.message);
  return (data || []) as Briefing[];
}

export default async function Home({ searchParams }: Props) {
  const dates        = await getDates();
  const selectedDate = searchParams.date || dates[0] || new Date().toISOString().split("T")[0];

  let briefings: Briefing[] = [];
  try { briefings = await getBriefings(selectedDate); } catch {}

  const hasData = briefings.length > 0;

  return (
    <div className="min-h-screen bg-[#09090b] dot-grid">

      {/* ── Header ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-5xl mx-auto px-5 h-13 flex items-center justify-between gap-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-zinc-200 tracking-tight">Fleet Briefing</span>
            <span className="text-zinc-700 text-xs hidden sm:inline">·</span>
            <span className="text-[11px] text-zinc-600 uppercase tracking-widest hidden sm:inline">Operaciones</span>
          </div>

          {/* Date tabs */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {dates.map(d => (
              <a
                key={d}
                href={`?date=${d}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all duration-200 ${
                  d === selectedDate
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50"
                    : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {d}
              </a>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10">

        {/* ── Section 1: Briefings ─────────────────────── */}
        <section className="mb-14">
          <div className="flex items-baseline gap-3 mb-6">
            <h1 className="text-[15px] font-semibold text-zinc-100 tracking-tight">Briefing operativo</h1>
            <span className="text-[13px] text-zinc-600 font-mono tabular-nums">{selectedDate}</span>
          </div>

          {hasData ? (
            <>
              <SummaryBar briefings={briefings} />
              <div className="grid gap-4 md:grid-cols-2">
                {briefings.map((b, i) => <BriefingCard key={b.city} b={b} index={i} />)}
              </div>
              <ChartPanel briefings={briefings} />
            </>
          ) : (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="w-8 h-8 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-zinc-500">Sin datos para {selectedDate}</p>
              <p className="text-[11px] text-zinc-700 mt-1">El agente corre automáticamente a las 07:00 UTC vía GitHub Actions</p>
            </div>
          )}
        </section>

        {/* ── Divider ──────────────────────────────────── */}
        <div className="relative mb-14">
          <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* ── Section 2: Upload ────────────────────────── */}
        <UploadAnalyzer />

        {/* ── Footer ───────────────────────────────────── */}
        <footer className="mt-20 pb-8 text-center">
          <p className="text-[10px] text-zinc-700 tracking-widest uppercase">
            fleet-briefing-agent · DeepSeek · Supabase · Vercel
          </p>
        </footer>
      </main>
    </div>
  );
}
