"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { Briefing } from "../lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
interface ChartConfig {
  title:   string;
  data:    Record<string, any>[];
  y_keys:  string[];
  summary: string;
  y_unit:  string;
}

// ── Safe KPI accessor ────────────────────────────────────────────────────────
const safeKpi = (v: number | undefined, decimals = 1) =>
  parseFloat((v ?? 0).toFixed(decimals));

// ── Auto-generated charts ────────────────────────────────────────────────────
function buildDefaultCharts(briefings: Briefing[]): ChartConfig[] {
  return [
    {
      title:   "Tasa de Utilización",
      y_keys:  ["Hoy", "Base 7d"],
      data:    briefings.map(b => ({
        name:      b.city,
        Hoy:       safeKpi((b.kpis_today?.tasa_utilizacion   ?? 0) * 100),
        "Base 7d": safeKpi((b.kpis_baseline?.tasa_utilizacion ?? 0) * 100),
      })),
      summary: "Porcentaje de horas con pasajero sobre horas disponibles. Mide la eficiencia de uso de la flota.",
      y_unit:  "%",
    },
    {
      title:   "MTTR — Tiempo Medio de Reparación",
      y_keys:  ["Hoy", "Base 7d"],
      data:    briefings.map(b => ({
        name:      b.city,
        Hoy:       safeKpi(b.kpis_today?.mttr_horas,    2),
        "Base 7d": safeKpi(b.kpis_baseline?.mttr_horas, 2),
      })),
      summary: "Horas medias por incidencia de mantenimiento. Valores menores indican mayor capacidad operativa.",
      y_unit:  "h",
    },
    {
      title:   "Coste por Kilómetro",
      y_keys:  ["Hoy", "Base 7d"],
      data:    briefings.map(b => ({
        name:      b.city,
        Hoy:       safeKpi(b.kpis_today?.cost_per_km,    3),
        "Base 7d": safeKpi(b.kpis_baseline?.cost_per_km, 3),
      })),
      summary: "Ratio de costes operativos totales sobre km recorridos. Indicador directo de eficiencia económica.",
      y_unit:  "€/km",
    },
    {
      title:   "Revenue Proxy",
      y_keys:  ["Hoy", "Base 7d"],
      data:    briefings.map(b => ({
        name:      b.city,
        Hoy:       safeKpi(b.kpis_today?.revenue_proxy,    0),
        "Base 7d": safeKpi(b.kpis_baseline?.revenue_proxy, 0),
      })),
      summary: "Estimación de ingresos calculada sobre viajes completados y tiempo con pasajero a 18 €/h.",
      y_unit:  "€",
    },
  ];
}

// ── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ config, isCustom }: { config: ChartConfig; isCustom?: boolean }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(18,18,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-2">
        <div>
          {isCustom && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-widest mb-1.5"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8" }}>
              <span className="w-1 h-1 rounded-full bg-indigo-400" />IA
            </span>
          )}
          <h3 className="text-[13px] font-semibold text-zinc-200 leading-tight">{config.title}</h3>
        </div>
        <span className="text-[11px] text-zinc-600 font-mono mt-0.5">{config.y_unit}</span>
      </div>

      {/* Chart */}
      <div className="px-2 pb-1">
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={config.data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                fontSize: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "#fafafa", fontWeight: 600, marginBottom: "2px" }}
              itemStyle={{ color: "#a1a1aa" }}
              formatter={(value: any) => [`${value} ${config.y_unit}`]}
            />
            <Bar dataKey={config.y_keys[0] ?? "Hoy"} name="Hoy" fill="#e4e4e7" radius={[3,3,0,0]} />
            {config.y_keys[1] && (
              <Bar dataKey={config.y_keys[1]} name="Base 7d" fill="#3f3f46" radius={[3,3,0,0]} />
            )}
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#71717a", paddingTop: "4px" }}
              iconType="circle"
              iconSize={7}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
        <p className="text-[11px] text-zinc-600 leading-relaxed">{config.summary}</p>
      </div>
    </div>
  );
}

// ── AI chart request ─────────────────────────────────────────────────────────
const EXAMPLES = [
  "¿Qué ciudad tiene peor disponibilidad?",
  "Comparar revenue por ciudad",
  "¿Dónde hay más anomalías?",
];

function ChartRequest({ briefings }: { briefings: Briefing[] }) {
  const [prompt,  setPrompt]  = useState("");
  const [loading, setLoading] = useState(false);
  const [chart,   setChart]   = useState<ChartConfig | null>(null);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(""); setChart(null);
    try {
      const res  = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefings, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar la gráfica");
      setChart(data);
      setPrompt("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {chart && <ChartCard config={chart} isCustom />}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Pide cualquier gráfica en lenguaje natural…"
            disabled={loading}
            className="w-full px-4 py-2.5 pr-10 text-[13px] rounded-xl transition-all outline-none placeholder:text-zinc-600"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e4e4e7",
            }}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 text-zinc-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-4 py-2.5 text-[12px] font-semibold rounded-xl transition-colors whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7" }}
        >
          Graficar
        </button>
      </form>

      {error && <p className="text-[11px] text-red-400 font-mono">{error}</p>}

      {!chart && !loading && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="px-3 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function ChartPanel({ briefings }: { briefings: Briefing[] }) {
  const charts = buildDefaultCharts(briefings);
  return (
    <div className="mt-8">
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-[15px] font-semibold text-zinc-100 tracking-tight">Visualizaciones</h2>
        <span className="text-[12px] text-zinc-600">Hoy vs baseline 7 días</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {charts.map((c, i) => <ChartCard key={i} config={c} />)}
      </div>

      {/* AI chart panel */}
      <div
        className="mt-4 rounded-2xl p-5"
        style={{ background: "rgba(18,18,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Gráfica personalizada con IA</p>
            <p className="text-[11px] text-zinc-600">Pide cualquier visualización en lenguaje natural</p>
          </div>
        </div>
        <ChartRequest briefings={briefings} />
      </div>
    </div>
  );
}
