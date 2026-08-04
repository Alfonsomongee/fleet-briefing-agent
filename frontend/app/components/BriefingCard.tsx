import type { Briefing } from "../lib/api";
import PriorityBadge from "./PriorityBadge";
import KpiTable from "./KpiTable";

const borderColors = {
  alta: "border-red-400",
  media: "border-amber-400",
  baja: "border-green-400",
  desconocida: "border-gray-300",
};

export default function BriefingCard({ b }: { b: Briefing }) {
  const border = borderColors[b.prioridad] ?? borderColors.desconocida;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 ${border} overflow-hidden`}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{b.city}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{b.date}</p>
        </div>
        <PriorityBadge priority={b.prioridad} />
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Resumen */}
        <p className="text-slate-600 text-sm leading-relaxed">{b.resumen}</p>

        {/* Alertas */}
        {b.alertas?.length > 0 && (
          <ul className="space-y-1">
            {b.alertas.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-amber-500">●</span>
                {a}
              </li>
            ))}
          </ul>
        )}

        {/* Recomendación */}
        <div className="bg-slate-50 rounded-lg px-4 py-3 border-l-2 border-slate-300">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Recomendación</p>
          <p className="text-sm text-slate-800">{b.recomendacion}</p>
        </div>

        {/* KPI table */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600 list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            KPIs detallados
          </summary>
          <div className="mt-3">
            <KpiTable today={b.kpis_today} baseline={b.kpis_baseline} />
          </div>
        </details>
      </div>
    </div>
  );
}
