"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Briefing } from "../lib/api";
import PriorityBadge from "./PriorityBadge";
import KpiTable from "./KpiTable";

/* ── Priority theming ──────────────────────────────────────── */
const theme: Record<string, { glow: string; border: string; dot: string }> = {
  alta:        { glow: "rgba(239,68,68,0.12)",    border: "rgba(239,68,68,0.25)",   dot: "bg-red-500" },
  media:       { glow: "rgba(245,158,11,0.10)",   border: "rgba(245,158,11,0.25)",  dot: "bg-amber-500" },
  baja:        { glow: "rgba(16,185,129,0.08)",   border: "rgba(16,185,129,0.22)",  dot: "bg-emerald-500" },
  desconocida: { glow: "rgba(255,255,255,0.03)",  border: "rgba(255,255,255,0.07)", dot: "bg-zinc-600" },
};

interface Props { b: Briefing; index?: number; }

export default function BriefingCard({ b, index = 0 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: "50%", y: "50%", op: 0 });

  const t = theme[b.prioridad] ?? theme.desconocida;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    setSpot({ x: `${e.clientX - r.left}px`, y: `${e.clientY - r.top}px`, op: 1 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={() => setSpot(s => ({ ...s, op: 0 }))}
        className="relative rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-0.5"
        style={{ background: "rgba(14,14,16,0.85)", border: `1px solid ${t.border}`, backdropFilter: "blur(16px)" }}
      >
        {/* Aceternity spotlight */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(320px circle at ${spot.x} ${spot.y}, ${t.glow}, transparent 70%)`,
            opacity: spot.op,
          }}
        />

        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3 relative">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-100 tracking-tight">{b.city}</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono tabular-nums">{b.date}</p>
          </div>
          <PriorityBadge priority={b.prioridad} />
        </div>

        <div className="px-5 pb-5 space-y-4 relative">
          {/* Resumen */}
          <p className="text-[13px] text-zinc-400 leading-relaxed">{b.resumen}</p>

          {/* Alertas */}
          {b.alertas?.length > 0 && (
            <ul className="space-y-2">
              {b.alertas.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${t.dot}`} />
                  {a}
                </li>
              ))}
            </ul>
          )}

          {/* Recomendación */}
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5">Recomendación</p>
            <p className="text-[13px] text-zinc-300 leading-snug">{b.recomendacion}</p>
          </div>

          {/* KPIs expandable */}
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest hover:text-zinc-300 transition-colors select-none">
              <svg className="w-3 h-3 transition-transform duration-200 group-open:rotate-90 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              KPIs detallados
              {b.anomalies_count > 0 && (
                <span className="ml-auto font-mono font-semibold text-amber-400 text-[10px]">
                  {b.anomalies_count} anomal{b.anomalies_count === 1 ? "ía" : "ías"}
                </span>
              )}
            </summary>
            <div className="mt-3">
              <KpiTable today={b.kpis_today} baseline={b.kpis_baseline} />
            </div>
          </details>
        </div>
      </div>
    </motion.div>
  );
}
