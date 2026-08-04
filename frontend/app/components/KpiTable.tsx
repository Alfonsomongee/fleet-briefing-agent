import type { Kpis } from "../lib/api";

const KPI_LABELS: Record<keyof Kpis, string> = {
  tasa_utilizacion:  "Tasa utilización",
  fleet_availability: "Disponibilidad flota",
  mttr_horas:        "MTTR (h)",
  cost_per_km:       "Coste / km (€)",
  on_time_rate:      "Tasa puntualidad",
  revenue_proxy:     "Revenue proxy (€)",
};

function delta(today: number, baseline: number) {
  if (!baseline) return 0;
  return ((today - baseline) / baseline) * 100;
}

export default function KpiTable({ today, baseline }: { today: Kpis; baseline: Kpis }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-3 py-2 font-semibold text-slate-400 uppercase tracking-wider">KPI</th>
            <th className="text-right px-3 py-2 font-semibold text-slate-400 uppercase tracking-wider">Hoy</th>
            <th className="text-right px-3 py-2 font-semibold text-slate-400 uppercase tracking-wider">7d base</th>
            <th className="text-right px-3 py-2 font-semibold text-slate-400 uppercase tracking-wider">Var.</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(KPI_LABELS) as (keyof Kpis)[]).map((key) => {
            const d = delta(today[key], baseline[key]);
            const pos = d >= 0;
            const sig = Math.abs(d) > 0.01;
            return (
              <tr key={key} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                <td className="px-3 py-2 text-slate-600">{KPI_LABELS[key]}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-800 tabular-nums">{today[key]?.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-400 tabular-nums">{baseline[key]?.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">
                  {sig ? (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono font-semibold text-xs ${
                      pos ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      {pos ? "+" : ""}{d.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-slate-300 font-mono">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
