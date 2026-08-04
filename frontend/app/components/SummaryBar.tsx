import type { Briefing } from "../lib/api";

const order   = { alta: 0, media: 1, baja: 2, desconocida: 3 };
const dotCls  = { alta: "bg-red-500", media: "bg-amber-500", baja: "bg-green-500", desconocida: "bg-slate-300" };
const textCls = { alta: "text-red-700 font-semibold", media: "text-amber-700 font-medium", baja: "text-green-700", desconocida: "text-slate-400" };

export default function SummaryBar({ briefings }: { briefings: Briefing[] }) {
  const sorted = [...briefings].sort(
    (a, b) => (order[a.prioridad] ?? 3) - (order[b.prioridad] ?? 3)
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-50">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Resumen del d&#237;a</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-50">
              <th className="text-left px-5 py-2.5 font-semibold">Ciudad</th>
              <th className="text-left px-4 py-2.5 font-semibold">Prioridad</th>
              <th className="text-center px-4 py-2.5 font-semibold">Anomal&#237;as</th>
              <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">Recomendaci&#243;n</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b, i) => (
              <tr key={b.city} className={`transition-colors hover:bg-slate-50/60 ${i < sorted.length - 1 ? "border-b border-slate-50" : ""}`}>
                <td className="px-5 py-3 font-semibold text-slate-800">{b.city}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls[b.prioridad] ?? dotCls.desconocida}`} />
                    <span className={`capitalize ${textCls[b.prioridad] ?? textCls.desconocida}`}>{b.prioridad}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-mono font-bold ${b.anomalies_count > 0 ? "text-amber-600" : "text-slate-300"}`}>
                    {b.anomalies_count}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-slate-500 text-xs line-clamp-1">{b.recomendacion}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
