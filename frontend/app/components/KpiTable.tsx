import type { Kpis } from "../lib/api";

const kpiMeta: { key: keyof Kpis; label: string; fmt: (v: number) => string }[] = [
  { key: "tasa_utilizacion",   label: "Utilización",      fmt: v => `${(v * 100).toFixed(1)}%` },
  { key: "fleet_availability", label: "Disponibilidad",   fmt: v => `${(v * 100).toFixed(1)}%` },
  { key: "mttr_horas",         label: "MTTR",             fmt: v => `${v.toFixed(2)} h` },
  { key: "cost_per_km",        label: "Coste / km",       fmt: v => `€ ${v.toFixed(3)}` },
  { key: "on_time_rate",       label: "Puntualidad",      fmt: v => `${(v * 100).toFixed(1)}%` },
  { key: "revenue_proxy",      label: "Revenue estimado", fmt: v => `€ ${v.toFixed(0)}` },
];

interface Props { today?: Partial<Kpis>; baseline?: Partial<Kpis>; }

export default function KpiTable({ today, baseline }: Props) {
  if (!today) return null;
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">KPI</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Hoy</th>
            {baseline && <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">7 d</th>}
            {baseline && <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Δ</th>}
          </tr>
        </thead>
        <tbody>
          {kpiMeta.map(({ key, label, fmt }) => {
            const v  = today[key] ?? 0;
            const bv = baseline?.[key] ?? 0;
            const d  = bv ? ((v - bv) / bv) * 100 : 0;
            const up = d > 2, dn = d < -2;
            return (
              <tr key={key} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td className="px-3 py-2 text-zinc-400">{label}</td>
                <td className="px-3 py-2 text-right text-zinc-100 font-mono">{fmt(v)}</td>
                {baseline && <td className="px-3 py-2 text-right text-zinc-600 font-mono">{fmt(bv)}</td>}
                {baseline && (
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${up ? "text-emerald-400" : dn ? "text-red-400" : "text-zinc-600"}`}>
                    {up ? "↑" : dn ? "↓" : "·"} {Math.abs(d).toFixed(1)}%
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
