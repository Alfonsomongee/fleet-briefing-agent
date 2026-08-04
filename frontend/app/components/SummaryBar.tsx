import type { Briefing } from "../lib/api";

const priorityOrder = { alta: 0, media: 1, baja: 2, desconocida: 3 };
const dotColor = { alta: "bg-red-500", media: "bg-amber-400", baja: "bg-green-500", desconocida: "bg-gray-300" };

export default function SummaryBar({ briefings }: { briefings: Briefing[] }) {
  const sorted = [...briefings].sort(
    (a, b) => (priorityOrder[a.prioridad] ?? 3) - (priorityOrder[b.prioridad] ?? 3)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-8">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resumen del día</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase tracking-wide">
              <th className="text-left pb-2 font-semibold">Ciudad</th>
              <th className="text-left pb-2 font-semibold">Prioridad</th>
              <th className="text-center pb-2 font-semibold">Alertas</th>
              <th className="text-left pb-2 font-semibold">Recomendación</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.city} className="border-t border-slate-100">
                <td className="py-2 font-semibold text-slate-800">{b.city}</td>
                <td className="py-2">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dotColor[b.prioridad]}`} />
                    <span className="capitalize text-slate-600">{b.prioridad}</span>
                  </span>
                </td>
                <td className="py-2 text-center">
                  <span className={`font-bold ${b.anomalies_count > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {b.anomalies_count}
                  </span>
                </td>
                <td className="py-2 text-slate-500 truncate max-w-xs">{b.recomendacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
