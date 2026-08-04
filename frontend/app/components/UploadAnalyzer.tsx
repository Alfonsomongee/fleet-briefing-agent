"use client";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Briefing } from "../lib/api";
import BriefingCard from "./BriefingCard";
import SummaryBar from "./SummaryBar";
import ChartPanel from "./ChartPanel";

// ── Types ────────────────────────────────────────────────────────────────────
type Status = "idle" | "previewing" | "mapping" | "analyzing" | "done" | "error";

interface ColumnSuggestion {
  fileColumn:           string;
  suggestedSystemField: string | null;
}

// ── System field catalogue ───────────────────────────────────────────────────
const SYSTEM_FIELDS: { key: string; label: string; desc: string; required?: boolean }[] = [
  { key: "date",                 label: "date",                 desc: "Fecha",                 required: true  },
  { key: "city",                 label: "city",                 desc: "Ciudad",                required: true  },
  { key: "total_vehicles",       label: "total_vehicles",       desc: "Vehículos totales"                      },
  { key: "vehicles_operational", label: "vehicles_operational", desc: "Vehículos operativos"                   },
  { key: "total_trips",          label: "total_trips",          desc: "Viajes totales"                         },
  { key: "hours_available",      label: "hours_available",      desc: "Horas disponibles"                      },
  { key: "hours_with_passenger", label: "hours_with_passenger", desc: "Horas con pasajero"                     },
  { key: "total_km",             label: "total_km",             desc: "Kilómetros totales"                     },
  { key: "total_cost_eur",       label: "total_cost_eur",       desc: "Coste total (€)"                        },
  { key: "maintenance_events",   label: "maintenance_events",   desc: "Eventos mantenimiento"                  },
  { key: "total_repair_hours",   label: "total_repair_hours",   desc: "Horas reparación"                       },
  { key: "cancelled_trips",      label: "cancelled_trips",      desc: "Viajes cancelados"                      },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const REQUIRED = new Set(["date","city"]);

export default function UploadAnalyzer() {
  const [status,      setStatus]      = useState<Status>("idle");
  const [briefings,   setBriefings]   = useState<Briefing[]>([]);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [warnings,    setWarnings]    = useState<string[]>([]);
  const [isDragging,  setIsDragging]  = useState(false);
  const [fileName,    setFileName]    = useState("");
  const [totalRows,   setTotalRows]   = useState(0);
  // Power Query state
  const [suggestions, setSuggestions] = useState<ColumnSuggestion[]>([]);
  const [mapping,     setMapping]     = useState<Record<string, string>>({}); // fileCol → systemField or "ignore"
  const fileRef  = useRef<HTMLInputElement>(null);
  const fileStore = useRef<File | null>(null);

  // ── Step 1: preview (get column suggestions) ─────────────────────────────
  const previewFile = async (file: File) => {
    setStatus("previewing");
    setFileName(file.name);
    fileStore.current = file;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/analyze?preview=true", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      // Build initial mapping from suggestions
      const initialMapping: Record<string, string> = {};
      (data.suggestions as ColumnSuggestion[]).forEach(s => {
        initialMapping[s.fileColumn] = s.suggestedSystemField ?? "ignore";
      });
      setSuggestions(data.suggestions);
      setMapping(initialMapping);
      setTotalRows(data.totalRows ?? 0);
      setStatus("mapping");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  };

  // ── Step 2: full analysis with confirmed mapping ──────────────────────────
  const runAnalysis = async () => {
    if (!fileStore.current) return;
    setStatus("analyzing");
    setBriefings([]); setWarnings([]);
    try {
      const fd = new FormData();
      fd.append("file", fileStore.current);
      fd.append("mapping", JSON.stringify(mapping));
      const res  = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      if (data.warnings?.length) setWarnings(data.warnings);
      setBriefings(data.briefings || []);
      setStatus("done");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) previewFile(file);
  }, []);

  const reset = () => {
    setStatus("idle"); setBriefings([]); setFileName(""); setErrorMsg("");
    setWarnings([]); setSuggestions([]); setMapping({}); fileStore.current = null;
  };

  const updateMapping = (fileCol: string, systemField: string) => {
    setMapping(prev => ({ ...prev, [fileCol]: systemField }));
  };

  // Mapping validation
  const mappedRequired  = SYSTEM_FIELDS.filter(f => f.required).every(f =>
    Object.values(mapping).includes(f.key)
  );
  const unmappedCount   = Object.values(mapping).filter(v => v === "ignore").length;
  const autoCount       = suggestions.filter(s => s.suggestedSystemField !== null).length;

  // Used system fields (to avoid double-mapping)
  const usedFields = new Set(Object.values(mapping).filter(v => v !== "ignore"));

  return (
    <section>
      {/* Section header */}
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-zinc-100 tracking-tight">Análisis instantáneo</h2>
        <p className="text-[13px] text-zinc-500 mt-1">
          Sube un CSV o Excel — mapeamos tus columnas automáticamente o las ajustas tú.
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── IDLE: Drop zone ─────────────────────────────────────────── */}
        {status === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 select-none ${
                isDragging ? "border-zinc-600 bg-zinc-800/30" : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-800/20"
              }`}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && previewFile(e.target.files[0])} />
              <div className={`mx-auto w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-colors ${isDragging ? "bg-zinc-700" : "bg-zinc-800/80"}`}>
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-[13px] text-zinc-400">
                Arrastra un archivo o{" "}
                <span className="text-zinc-200 font-medium underline underline-offset-2">selecciona uno</span>
              </p>
              <p className="text-[11px] text-zinc-600 mt-1">CSV · XLS · XLSX</p>
            </div>

            {/* Schema hint */}
            <details className="mt-3 group">
              <summary className="cursor-pointer flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors select-none w-fit">
                <svg className="w-3 h-3 transition-transform duration-150 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Ver columnas esperadas
              </summary>
              <div className="mt-2 ml-4 p-4 rounded-xl text-[11px] font-mono leading-relaxed"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-zinc-500 mb-1.5 font-sans text-[10px] uppercase tracking-widest not-italic">Requeridas</p>
                <p className="text-emerald-400 mb-3">date, city</p>
                <p className="text-zinc-500 mb-1.5 font-sans text-[10px] uppercase tracking-widest not-italic">KPI (aliases aceptados en ES/EN)</p>
                <p className="text-zinc-600">total_vehicles · vehicles_operational · total_trips · hours_available · hours_with_passenger · total_km · total_cost_eur · maintenance_events · total_repair_hours · cancelled_trips</p>
              </div>
            </details>
          </motion.div>
        )}

        {/* ── PREVIEWING: loading ─────────────────────────────────────── */}
        {status === "previewing" && (
          <motion.div key="previewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <div className="h-8 w-48 skeleton" />
            {[1,2,3,4,5].map(i => <div key={i} className="h-9 skeleton" />)}
            <p className="text-center text-[11px] text-zinc-600 pt-1">Leyendo cabeceras del archivo…</p>
          </motion.div>
        )}

        {/* ── MAPPING: Power Query UI ─────────────────────────────────── */}
        {status === "mapping" && (
          <motion.div key="mapping" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">Mapeo de columnas</p>
                <p className="text-[11px] text-zinc-600 mt-0.5 font-mono">
                  {fileName} · {suggestions.length} columnas · {totalRows.toLocaleString()} filas
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-400">{autoCount} auto</span>
                {unmappedCount > 0 && <span className="text-amber-400">{unmappedCount} sin mapear</span>}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_80px] px-4 py-2.5"
                style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Tu archivo</span>
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Campo del sistema</span>
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Estado</span>
              </div>

              {/* Rows */}
              <div style={{ background: "rgba(14,14,16,0.9)" }}>
                {suggestions.map((s, i) => {
                  const currentVal   = mapping[s.fileColumn] ?? "ignore";
                  const isAuto       = s.suggestedSystemField !== null && currentVal === s.suggestedSystemField;
                  const isIgnored    = currentVal === "ignore";
                  const isRequired   = !isIgnored && REQUIRED.has(currentVal);
                  const missingReq   = isIgnored && suggestions.some(x => REQUIRED.has(x.suggestedSystemField ?? "")) &&
                                       REQUIRED.has(s.suggestedSystemField ?? "X");

                  return (
                    <div key={s.fileColumn}
                      className="grid grid-cols-[1fr_1fr_80px] items-center px-4 py-2.5 transition-colors hover:bg-white/[0.015]"
                      style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>

                      {/* File column */}
                      <span className="text-[12px] font-mono text-zinc-300 truncate pr-3">{s.fileColumn}</span>

                      {/* Select */}
                      <div className="pr-3">
                        <select
                          value={currentVal}
                          onChange={e => updateMapping(s.fileColumn, e.target.value)}
                          className="w-full text-[12px] rounded-lg px-2.5 py-1.5 outline-none transition-colors cursor-pointer"
                          style={{
                            background: isIgnored ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${isIgnored ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.09)"}`,
                            color: isIgnored ? "#52525b" : "#e4e4e7",
                          }}
                        >
                          <option value="ignore" style={{ background: "#18181b", color: "#71717a" }}>— Sin mapear</option>
                          <optgroup label="Requeridas" style={{ background: "#18181b", color: "#a1a1aa" }}>
                            {SYSTEM_FIELDS.filter(f => f.required).map(f => (
                              <option key={f.key} value={f.key}
                                disabled={usedFields.has(f.key) && currentVal !== f.key}
                                style={{ background: "#18181b", color: usedFields.has(f.key) && currentVal !== f.key ? "#52525b" : "#fafafa" }}>
                                {f.label} — {f.desc}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="KPIs" style={{ background: "#18181b", color: "#a1a1aa" }}>
                            {SYSTEM_FIELDS.filter(f => !f.required).map(f => (
                              <option key={f.key} value={f.key}
                                disabled={usedFields.has(f.key) && currentVal !== f.key}
                                style={{ background: "#18181b", color: usedFields.has(f.key) && currentVal !== f.key ? "#52525b" : "#e4e4e7" }}>
                                {f.label} — {f.desc}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Status badge */}
                      <div className="flex justify-end">
                        {isIgnored ? (
                          <span className="text-[10px] font-medium text-zinc-600 px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            ignorar
                          </span>
                        ) : isAuto ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />auto
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                            <span className="w-1 h-1 rounded-full bg-amber-500" />manual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer status + actions */}
            <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 text-[11px]">
                {mappedRequired ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    date y city mapeados
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Mapea date y city para continuar
                  </span>
                )}
                {unmappedCount > 0 && (
                  <span className="text-zinc-600">
                    {unmappedCount} columna{unmappedCount !== 1 ? "s" : ""} ignorada{unmappedCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={reset} className="px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  ← Otro archivo
                </button>
                <button
                  onClick={runAnalysis}
                  disabled={!mappedRequired}
                  className="px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fafafa" }}>
                  Analizar con este mapeo →
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ANALYZING: skeletons ────────────────────────────────────── */}
        {status === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton" />)}
            <p className="text-center text-[11px] text-zinc-600 tracking-wide">
              Calculando KPIs · Detectando anomalías · Generando briefing con DeepSeek…
            </p>
          </motion.div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────── */}
        {status === "error" && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-5 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
            <p className="text-[13px] font-semibold text-red-400">Error al analizar el archivo</p>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">{errorMsg}</p>
            <button onClick={reset} className="mt-3 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
              Intentar de nuevo
            </button>
          </motion.div>
        )}

        {/* ── DONE: results ───────────────────────────────────────────── */}
        {status === "done" && briefings.length > 0 && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mb-4 p-3 rounded-xl"
                style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
                {warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-500/80">⚠ {w}</p>)}
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-[12px] text-zinc-500 font-mono">{fileName}</p>
              </div>
              <button onClick={reset} className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">
                Analizar otro
              </button>
            </div>
            <SummaryBar briefings={briefings} />
            <div className="grid gap-4 md:grid-cols-2">
              {briefings.map((b, i) => <BriefingCard key={b.city} b={b} index={i} />)}
            </div>
            <ChartPanel briefings={briefings} />
          </motion.div>
        )}

        {status === "done" && briefings.length === 0 && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-5 p-4 rounded-2xl text-center"
            style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <p className="text-[13px] text-amber-400">No se encontraron datos válidos en el archivo.</p>
            <p className="text-[11px] text-zinc-600 mt-1">Revisa que el mapeo de columnas sea correcto.</p>
            <button onClick={() => setStatus("mapping")} className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
              Revisar mapeo
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </section>
  );
}
