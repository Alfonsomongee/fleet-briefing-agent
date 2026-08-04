"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Briefing } from "../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChartConfig {
  title: string;
  data: Record<string, any>[];
  y_keys: string[];
  summary: string;
  y_unit: string;
}

// ── Auto-generated charts from briefing KPI data ───────────────────────────────
function buildDefaultCharts(briefings: Briefing[]): ChartConfig[] {
  return [
    {
      title: "Tasa de Utilización",
      y_keys: ["Hoy", "Base 7d"],
      data: briefings.map((b) => ({
        name: b.city,
        Hoy: parseFloat((b.kpis_today.tasa_utilizacion * 100).toFixed(1)),
        "Base 7d": parseFloat((b.kpis_baseline.tasa_utilizacion * 100).toFixed(1)),
      })),
      summary:
        "Porcentaje de horas con pasajero sobre horas disponibles. Mide la eficiencia de uso de la flota en activo.",
      y_unit: "%",
    },
    {
      title: "MTTR — Tiempo Medio de Reparación",
      y_keys: ["Hoy", "Base 7d"],
      data: briefings.map((b) => ({
        name: b.city,
        Hoy: parseFloat(b.kpis_today.mttr_horas.toFixed(2)),
        "Base 7d": parseFloat(b.kpis_baseline.mttr_horas.toFixed(2)),
      })),
      summary:
        "Horas medias por incidencia de mantenimiento. Valores menores indican mayor capacidad operativa del equipo técnico.",
      y_unit: "h",
    },
    {
      title: "Coste por Kilómetro",
      y_keys: ["Hoy", "Base 7d"],
      data: briefings.map((b) => ({
        name: b.city,
        Hoy: parseFloat(b.kpis_today.cost_per_km.toFixed(3)),
        "Base 7d": parseFloat(b.kpis_baseline.cost_per_km.toFixed(3)),
      })),
      summary:
        "Ratio de costes operativos totales sobre kilómetros recorridos. Indicador directo de eficiencia económica.",
      y_unit: "€/km",
    },
    {
      title: "Revenue Proxy",
      y_keys: ["Hoy", "Base 7d"],
      data: briefings.map((b) => ({
        name: b.city,
        Hoy: parseFloat(b.kpis_today.revenue_proxy.toFixed(0)),
        "Base 7d": parseFloat(b.kpis_baseline.revenue_proxy.toFixed(0)),
      })),
      summary:
        "Estimación de ingresos calculada sobre viajes completados y tiempo con pasajero a 18 €/h.",
      y_unit: "€",
    },
  ];
}

// ── Chart card ─────────────────────────────────────────────────────────────────
function ChartCard({ config, isCustom }: { config: ChartConfig; isCustom?: boolean }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden ${
        isCustom ? "animate-fade-in-up" : ""
      }`}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-1 flex items-start justify-between gap-2">
        <div>
          {isCustom && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 ring-1 ring-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-widest mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              IA
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-800 leading-tight">{config.title}</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono whitespace-nowrap mt-0.5">
          {config.y_unit}
        </span>
      </div>

      {/* Chart */}
      <div className="px-2 pb-1">
        <ResponsiveContainer width="100%" height={195}>
          <BarChart data={config.data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "#1E293B", fontWeight: 600, marginBottom: "2px" }}
              itemStyle={{ color: "#475569" }}
              formatter={(value: any) => [`${value} ${config.y_unit}`]}
            />
            <Bar
              dataKey={config.y_keys[0] ?? "Hoy"}
              name="Hoy"
              fill="#334155"
              radius={[3, 3, 0, 0]}
            />
            {config.y_keys[1] && (
              <Bar
                dataKey={config.y_keys[1]}
                name="Base 7d"
                fill="#CBD5E1"
                radius={[3, 3, 0, 0]}
              />
            )}
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#94A3B8", paddingTop: "4px" }}
              iconType="circle"
              iconSize={8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/60">
        <p className="text-xs text-slate-500 leading-relaxed">{config.summary}</p>
      </div>
    </div>
  );
}

// ── AI chart request widget ────────────────────────────────────────────────────
const EXAMPLES = [
  "¿Qué ciudad tiene peor disponibilidad de flota?",
  "Comparar revenue por ciudad",
  "¿Dónde hay más anomalías?",
];

function ChartRequest({ briefings }: { briefings: Briefing[] }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<ChartConfig | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setChart(null);
    try {
      const res = await fetch("/api/chart", {
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
      {/* AI-generated chart result */}
      {chart && <ChartCard config={chart} isCustom />}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Pide cualquier gráfica en lenguaje natural…"
            className="w-full px-4 py-2.5 pr-10 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-slate-400"
            disabled={loading}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="w-4 h-4 text-slate-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Graficar
        </button>
      </form>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Example chips */}
      {!chart && !loading && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="px-3 py-1 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function ChartPanel({ briefings }: { briefings: Briefing[] }) {
  const defaultCharts = buildDefaultCharts(briefings);

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-baseline gap-2.5 mb-5">
        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
          Visualizaciones
        </h2>
        <span className="text-xs text-slate-400">Hoy vs baseline 7 d&#237;as</span>
      </div>

      {/* Auto-generated charts grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {defaultCharts.map((c, i) => (
          <ChartCard key={i} config={c} />
        ))}
      </div>

      {/* AI chart request panel */}
      <div className="mt-5 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Gráfica personalizada con IA</p>
            <p className="text-xs text-slate-400">
              Pide cualquier visualización en lenguaje natural
            </p>
          </div>
        </div>
        <ChartRequest briefings={briefings} />
      </div>
    </div>
  );
}
