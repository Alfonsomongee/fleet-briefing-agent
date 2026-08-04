import type { Briefing } from "../lib/api";
import PriorityBadge from "./PriorityBadge";
import KpiTable from "./KpiTable";

const leftBorder: Record<string, string> = {
  alta:        "border-l-red-400",
  media:       "border-l-amber-400",
  baja:        "border-l-green-400",
  desconocida: "border-l-slate-200",
};

const alertDot: Record<string, string> = {
  alta:        "bg-red-400",
  media:       "bg-amber-400",
  baja:        "bg-green-400",
  desconocida: "bg-slate-300",
};

export default function BriefingCard({ b }: { b: Briefing }) {
  const border = leftBorder[b.prioridad] ?? leftBorder.desconocida;
  const dot    = alertDot[b.prioridad]   ?? alertDot.desconocida;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${border} overflow-hidden transition-shadow duration-200 hover:shadow-md`}>
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">{b.city}</h2>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{b.date}</p>
        </div>
        <PriorityBadge priority={b.prioridad} />
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Resumen */}
        <p className="text-sm text-slate-600 leading-relaxed">{b.resumen}</p>

        {/* Alertas */}
        {b.alertas?.length > 0 && (
          <ul className="space-y-1.5">
            {b.alertas.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
                {a}
              </li>
            ))}
          </ul>
        )}

        {/* Recomendación */}
        <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Recomendación</p>
          <p className="text-sm text-slate-700 leading-snug">{b.recomendacion}</p>
        </div>

        {/* KPI expandable */}
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors select-none">
            <svg className="w-3 h-3 transition-transform duration-150 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            KPIs detallados
            {b.anomalies_count > 0 && (
              <span className="ml-auto font-mono font-bold text-amber-500">{b.anomalies_count} anomal{b.anomalies_count === 1 ? "ía" : "ías"}</span>
            )}
          </summary>
          <div className="mt-3">
            <KpiTable today={b.kpis_today} baseline={b.kpis_baseline} />
          </div>
        </details>
      </div>
    </div>
  );
}
