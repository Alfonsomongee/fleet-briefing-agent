"use client";
import { motion } from "framer-motion";
import type { Briefing } from "../lib/api";

export default function SummaryBar({ briefings }: { briefings: Briefing[] }) {
  const total          = briefings.length;
  const alta           = briefings.filter(b => b.prioridad === "alta").length;
  const media          = briefings.filter(b => b.prioridad === "media").length;
  const baja           = briefings.filter(b => b.prioridad === "baja").length;
  const totalAnomalies = briefings.reduce((s, b) => s + (b.anomalies_count || 0), 0);

  const stats = [
    { label: "Ciudades",       value: total,          color: "text-zinc-100" },
    { label: "Alta prioridad", value: alta,            color: alta  > 0 ? "text-red-400"     : "text-zinc-600" },
    { label: "Media",          value: media,           color: media > 0 ? "text-amber-400"   : "text-zinc-600" },
    { label: "Baja",           value: baja,            color:              "text-emerald-400" },
    { label: "Anomalías",      value: totalAnomalies,  color: totalAnomalies > 0 ? "text-amber-400" : "text-zinc-600" },
  ];

  return (
    <div
      className="rounded-2xl mb-5 px-6 py-4 flex flex-wrap gap-8"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="flex flex-col gap-0.5"
        >
          <span className={`text-2xl font-semibold tabular-nums font-mono leading-none ${s.color}`}>
            {s.value}
          </span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
