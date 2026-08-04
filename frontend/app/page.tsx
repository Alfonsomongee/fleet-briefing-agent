import { createServerClient } from "./lib/supabase";
import BriefingCard from "./components/BriefingCard";
import SummaryBar from "./components/SummaryBar";
import UploadAnalyzer from "./components/UploadAnalyzer";
import dynamic from "next/dynamic";
import type { Briefing } from "./lib/api";
import type { Metadata } from "next";

// Load chart panel client-side only (recharts needs browser APIs)
const ChartPanel = dynamic(() => import("./components/ChartPanel"), {
  ssr: false,
  loading: () => (
    <div className="mt-8 space-y-5">
      <div className="h-6 w-40 skeleton" />
      <div className="grid gap-5 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-52 skeleton" />
        ))}
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Fleet Briefing — Dashboard Operativo",
  description: "Briefings diarios de flota VTC generados con DeepSeek AI",
};

export const revalidate = 300;

interface Props {
  searchParams: { date?: string };
}

async function getDates(): Promise<string[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("briefings")
      .select("date")
      .order("date", { ascending: false })
      .limit(35);
    return [...new Set((data || []).map((r: any) => r.date as string))].slice(0, 7);
  } catch {
    return [];
  }
}

async function getBriefings(date: string): Promise<Briefing[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("date", date)
    .order("city");
  if (error) throw new Error(error.message);
  return (data || []) as Briefing[];
}

export default async function Home({ searchParams }: Props) {
  const dates = await getDates();
  const selectedDate =
    searchParams.date || dates[0] || new Date().toISOString().split("T")[0];

  let briefings: Briefing[] = [];
  try {
    briefings = await getBriefings(selectedDate);
  } catch {}

  const hasData = briefings.length > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-sm">Fleet Briefing</span>
            <span className="text-slate-200 text-xs hidden sm:inline">|</span>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest hidden sm:inline">Operaciones</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {dates.map((d) => (
              <a key={d} href={`?date=${d}`}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors tabular-nums ${
                  d === selectedDate
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >{d}</a>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">

        {/* ── Section 1: Daily briefings ── */}
        <section className="mb-12">
          <div className="flex items-baseline gap-2.5 mb-6">
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">Briefing operativo</h1>
            <span className="text-sm text-slate-400 tabular-nums">{selectedDate}</span>
          </div>

          {hasData ? (
            <>
              <SummaryBar briefings={briefings} />
              <div className="grid gap-5 md:grid-cols-2">
                {briefings.map((b) => (
                  <BriefingCard key={b.city} b={b} />
                ))}
              </div>
              {/* Chart panel — loaded client-side */}
              <ChartPanel briefings={briefings} />
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 p-10 text-center shadow-sm">
              <div className="w-8 h-8 rounded-full bg-slate-100 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">Sin datos para {selectedDate}</p>
              <p className="text-xs text-slate-400 mt-1">El agente corre autom&#225;ticamente a las 07:00 UTC v&#237;a GitHub Actions</p>
            </div>
          )}
        </section>

        {/* ── Divider ── */}
        <div className="relative mb-12">
          <div className="border-t border-slate-100" />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F8FAFC] px-3 text-xs text-slate-300 uppercase tracking-widest font-medium">
            An&#225;lisis instant&#225;neo
          </span>
        </div>

        {/* ── Section 2: File upload analyzer ── */}
        <UploadAnalyzer />

        <footer className="mt-16 pb-8 text-center">
          <p className="text-xs text-slate-300 tracking-wide">
            fleet-briefing-agent &middot; DeepSeek &middot; Supabase &middot; Vercel
          </p>
        </footer>
      </main>
    </div>
  );
}
