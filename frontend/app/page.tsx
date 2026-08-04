import { fetchBriefings, fetchDates } from "./lib/api";
import BriefingCard from "./components/BriefingCard";
import SummaryBar from "./components/SummaryBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleet Briefing Dashboard",
  description: "Daily VTC fleet operational briefings",
};

// Revalidate every 5 minutes
export const revalidate = 300;

interface Props {
  searchParams: { date?: string };
}

export default async function Home({ searchParams }: Props) {
  const dates = await fetchDates();
  const selectedDate = searchParams.date || dates[0] || new Date().toISOString().split("T")[0];

  let briefings = [];
  let error = "";
  try {
    briefings = await fetchBriefings(selectedDate);
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚗</span>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Fleet Briefing</h1>
              <p className="text-xs text-slate-400">Operational Intelligence Dashboard</p>
            </div>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            {dates.map((d) => (
              <a
                key={d}
                href={`?date=${d}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  d === selectedDate
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {d}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold">No hay datos para {selectedDate}</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        ) : (
          <>
            <SummaryBar briefings={briefings} />
            <div className="grid gap-6 md:grid-cols-2">
              {briefings.map((b) => (
                <BriefingCard key={b.city} b={b} />
              ))}
            </div>
          </>
        )}

        <footer className="mt-12 text-center text-xs text-slate-300">
          fleet-briefing-agent · powered by DeepSeek · deployed on Railway + Vercel
        </footer>
      </div>
    </main>
  );
}
