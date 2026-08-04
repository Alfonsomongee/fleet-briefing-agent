import type { Kpis } from "../lib/api";

const KPI_LABELS: Record<keyof Kpis, string> = {
  tasa_utilizacion: "Tasa utilización",
  fleet_availability: "Disponibilidad flota",
  mttr_horas: "MTTR (h)",
  cost_per_km: "Coste/km (€)",
  on_time_rate: "Tasa puntualidad",
  revenue_proxy: "Revenue proxy (€)",
};

function pct(today: number, baseline: number) {
  if (!baseline) return 0;
  return ((today - baseline) / baseline) * 100;
}

export default function KpiTable({ today, baseline }: { today: Kpis; baseline: Kpis }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-3 py-2 font-semibold">KPI</th>
            <th className="text-right px-3 py-2 font-semibold">Hoy</th>
            <th className="text-right px-3 py-2 font-semibold">Baseline 7d</th>
            <th className="text-right px-3 py-2 font-semibold">Δ</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(KPI_LABELS) as (keyof Kpis)[]).map((key) => {
            const d = pct(today[key], baseline[key]);
            const isPositive = d >= 0;
            return (
              <tr key={key} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-700">{KPI_LABELS[key]}</td>
                <td className="px-3 py-2 text-right font-mono">{today[key]?.toFixed(4)}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-400">{baseline[key]?.toFixed(4)}</td>
                <td className={`px-3 py-2 text-right font-semibold font-mono ${isPositive ? "text-green-600" : "text-red-600"}`}>
                  {isPositive ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
