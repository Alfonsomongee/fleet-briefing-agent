"use client";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Briefing } from "../lib/api";
import BriefingCard from "./BriefingCard";
import SummaryBar from "./SummaryBar";
import ChartPanel from "./ChartPanel";

type Status = "idle" | "analyzing" | "done" | "error";

interface ColumnError {
  missing_columns: string[];
  found_columns:   string[];
  hint:            string;
}

export default function UploadAnalyzer() {
  const [status,    setStatus]    = useState<Status>("idle");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [colError,  setColError]  = useState<ColumnError | null>(null);
  const [warnings,  setWarnings]  = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName,  setFileName]  = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setStatus("analyzing");
    setFileName(file.name);
    setBriefings([]);
    setErrorMsg("");
    setColError(null);
    setWarnings([]);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        // Column validation error from the API
        if (data.missing_columns) {
          setColError({ missing_columns: data.missing_columns, found_columns: data.found_columns, hint: data.hint });
          setStatus("error");
        } else {
          throw new Error(data.error || `Error ${res.status}`);
        }
        return;
      }

      if (data.warnings?.length) setWarnings(data.warnings);
      setBriefings(data.briefings || []);
      setStatus("done");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const reset = () => {
    setStatus("idle"); setBriefings([]); setFileName("");
    setErrorMsg(""); setColError(null); setWarnings([]);
  };

  /* ── Required columns list ── */
  const REQUIRED = ["date", "city"];
  const OPTIONAL = ["total_vehicles","vehicles_operational","total_trips","hours_available","hours_with_passenger","total_km","total_cost_eur","maintenance_events","total_repair_hours","cancelled_trips"];

  return (
    <section>
      {/* Section header */}
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-zinc-100 tracking-tight">Análisis instantáneo</h2>
        <p className="text-[13px] text-zinc-500 mt-1">
          Sube un CSV o Excel con datos de flota y obtén briefings al instante vía DeepSeek.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 select-none ${
          isDragging
            ? "border-zinc-500 bg-zinc-800/30"
            : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/20"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        <div className={`mx-auto w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
          isDragging ? "bg-zinc-700" : "bg-zinc-800"
        }`}>
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
        <div className="mt-2 ml-4 p-4 rounded-xl text-[11px] font-mono leading-relaxed" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-zinc-500 mb-2 font-sans font-semibold not-italic text-[10px] uppercase tracking-widest">Requeridas</p>
          <p className="text-emerald-400 mb-3">{REQUIRED.join(", ")}</p>
          <p className="text-zinc-500 mb-2 font-sans font-semibold not-italic text-[10px] uppercase tracking-widest">KPI (opcionales, se aceptan alias)</p>
          <p className="text-zinc-500">{OPTIONAL.join(", ")}</p>
        </div>
      </details>

      <AnimatePresence>
        {/* Analyzing */}
        {status === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-4"
          >
            {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton" />)}
            <p className="text-center text-[11px] text-zinc-600 tracking-wide">
              Calculando KPIs · Detectando anomalías · Generando briefing con DeepSeek…
            </p>
          </motion.div>
        )}

        {/* Error — column validation */}
        {status === "error" && colError && (
          <motion.div
            key="col-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 p-5 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <p className="text-[13px] font-semibold text-red-400 mb-1">Columnas requeridas no encontradas</p>
            <p className="text-[11px] text-zinc-400 mb-3">{colError.hint}</p>
            <div className="flex gap-4 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Faltan</p>
                <div className="flex gap-1 flex-wrap">
                  {colError.missing_columns.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-md text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Encontradas en el archivo</p>
                <div className="flex gap-1 flex-wrap">
                  {colError.found_columns.slice(0, 12).map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-500 bg-zinc-800/50 border border-zinc-700/30">{c}</span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={reset} className="mt-4 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
              Intentar con otro archivo
            </button>
          </motion.div>
        )}

        {/* Error — generic */}
        {status === "error" && !colError && (
          <motion.div
            key="gen-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 p-4 rounded-2xl"
            style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}
          >
            <p className="text-[13px] font-semibold text-red-400">Error al analizar el archivo</p>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">{errorMsg}</p>
            <button onClick={reset} className="mt-3 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
              Intentar de nuevo
            </button>
          </motion.div>
        )}

        {/* Warnings */}
        {status === "done" && warnings.length > 0 && (
          <motion.div
            key="warnings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 rounded-xl"
            style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            {warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-amber-500/80">⚠ {w}</p>
            ))}
          </motion.div>
        )}

        {/* Results */}
        {status === "done" && briefings.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-7"
          >
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

        {/* Done but empty */}
        {status === "done" && briefings.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 p-4 rounded-2xl text-center"
            style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            <p className="text-[13px] text-amber-400">No se encontraron datos válidos en el archivo.</p>
            <p className="text-[11px] text-zinc-600 mt-1">Comprueba que las columnas coincidan con el esquema esperado.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
