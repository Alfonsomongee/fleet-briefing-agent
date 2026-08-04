"use client";
import { useState, useCallback, useRef } from "react";
import type { Briefing } from "../lib/api";
import BriefingCard from "./BriefingCard";
import SummaryBar from "./SummaryBar";
import ChartPanel from "./ChartPanel";

type Status = "idle" | "analyzing" | "done" | "error";

export default function UploadAnalyzer() {
  const [status, setStatus] = useState<Status>("idle");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setStatus("analyzing");
    setFileName(file.name);
    setBriefings([]);
    setErrorMsg("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
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
    setStatus("idle");
    setBriefings([]);
    setFileName("");
    setErrorMsg("");
  };

  return (
    <section>
      {/* Section header */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Analizar archivo</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Sube un CSV, Excel o JSON con datos de flota para obtener briefing y gr&#225;ficas al instante
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 select-none ${
          isDragging
            ? "border-blue-400 bg-blue-50/40 upload-drag-active"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${
          isDragging ? "bg-blue-100" : "bg-slate-100"
        }`}>
          <svg className={`w-5 h-5 transition-colors ${isDragging ? "text-blue-500" : "text-slate-400"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-sm text-slate-600">
          Arrastra un archivo o{" "}
          <span className="text-blue-600 font-medium">selecciona uno</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          CSV &middot; XLS &middot; XLSX &middot; JSON &mdash; misma estructura que el agente
        </p>
      </div>

      {/* Schema hint */}
      <details className="mt-3 group">
        <summary className="cursor-pointer list-none flex items-center gap-1 text-xs text-slate-400 hover:text-slate-500 transition-colors select-none w-fit">
          <svg className="w-3 h-3 transition-transform duration-150 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Ver esquema esperado de columnas
        </summary>
        <div className="mt-2 ml-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono text-slate-500 leading-relaxed">
          date, city, total_vehicles, vehicles_operational, total_trips,<br />
          hours_available, hours_with_passenger, total_km,<br />
          total_cost_eur, maintenance_events, total_repair_hours, cancelled_trips
        </div>
      </details>

      {/* Analyzing state */}
      {status === "analyzing" && (
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 skeleton" />
          ))}
          <p className="text-center text-xs text-slate-400 mt-2 tracking-wide">
            Calculando KPIs &middot; Detectando anomal&#237;as &middot; Generando briefing con DeepSeek&hellip;
          </p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm font-semibold text-red-700">Error al analizar el archivo</p>
          <p className="text-xs text-red-500 mt-1 font-mono">{errorMsg}</p>
          <button onClick={reset} className="mt-3 text-xs text-red-600 underline hover:text-red-800 transition-colors">
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Results */}
      {status === "done" && briefings.length > 0 && (
        <div className="mt-7">
          {/* File indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <p className="text-xs text-slate-500 font-medium">{fileName}</p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Analizar otro archivo
            </button>
          </div>

          {/* Briefing cards */}
          <div className="animate-fade-in-up">
            <SummaryBar briefings={briefings} />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {briefings.map((b) => (
              <div key={b.city} className="animate-fade-in-up">
                <BriefingCard b={b} />
              </div>
            ))}
          </div>

          {/* Charts panel */}
          <ChartPanel briefings={briefings} />
        </div>
      )}

      {status === "done" && briefings.length === 0 && (
        <div className="mt-5 p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
          <p className="text-sm text-amber-700">No se encontraron datos v&#225;lidos en el archivo.</p>
          <p className="text-xs text-amber-500 mt-1">
            Comprueba que las columnas coincidan con el esquema esperado.
          </p>
        </div>
      )}
    </section>
  );
}
