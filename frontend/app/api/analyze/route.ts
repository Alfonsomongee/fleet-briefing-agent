import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const runtime     = "nodejs";
export const maxDuration = 60;

// ── DeepSeek client ──────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-d06aa6133a3e4cb1a4f1cfb50fdd218d";
const openai = new OpenAI({ apiKey: DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });

// ── Types ────────────────────────────────────────────────────────────────────
interface FleetRow {
  date:                 string;
  city:                 string;
  total_vehicles:       number;
  vehicles_operational: number;
  total_trips:          number;
  hours_available:      number;
  hours_with_passenger: number;
  total_km:             number;
  total_cost_eur:       number;
  maintenance_events:   number;
  total_repair_hours:   number;
  cancelled_trips:      number;
}

interface Kpis {
  tasa_utilizacion:   number;
  fleet_availability: number;
  mttr_horas:         number;
  cost_per_km:        number;
  on_time_rate:       number;
  revenue_proxy:      number;
}

interface Anomaly {
  kpi:            keyof Kpis;
  valor_hoy:      number;
  valor_baseline: number;
  desviacion_pct: number;
  direccion:      "subida" | "bajada";
  critico:        boolean;
}

// ── Column metadata ──────────────────────────────────────────────────────────
const FLEET_COLUMNS = new Set<string>([
  "date","city","total_vehicles","vehicles_operational","total_trips",
  "hours_available","hours_with_passenger","total_km","total_cost_eur",
  "maintenance_events","total_repair_hours","cancelled_trips",
]);

const COLUMN_ALIASES: Record<string, keyof FleetRow> = {
  // date
  fecha:"date", day:"date", dia:"date", fecha_registro:"date",
  // city
  ciudad:"city", location:"city", ubicacion:"city", sede:"city",
  region:"city", localidad:"city", territorio:"city",
  // total_vehicles
  vehicles:"total_vehicles", vehiculos:"total_vehicles",
  flota:"total_vehicles", total_vehiculos:"total_vehicles",
  num_vehicles:"total_vehicles", n_vehicles:"total_vehicles",
  // vehicles_operational
  operational:"vehicles_operational", operacionales:"vehicles_operational",
  vehiculos_operacionales:"vehicles_operational", activos:"vehicles_operational",
  vehicles_active:"vehicles_operational", operativos:"vehicles_operational",
  // total_trips
  trips:"total_trips", viajes:"total_trips", servicios:"total_trips",
  total_viajes:"total_trips", num_trips:"total_trips", num_viajes:"total_trips",
  // hours_available
  horas_disponibles:"hours_available", available_hours:"hours_available",
  horas_disp:"hours_available",
  // hours_with_passenger
  horas_con_pasajero:"hours_with_passenger", occupied_hours:"hours_with_passenger",
  horas_pasajero:"hours_with_passenger", passenger_hours:"hours_with_passenger",
  horas_pax:"hours_with_passenger",
  // total_km
  km:"total_km", kilometros:"total_km", distance:"total_km",
  km_total:"total_km", kms:"total_km", distancia:"total_km",
  // total_cost_eur
  cost:"total_cost_eur", coste:"total_cost_eur", costs:"total_cost_eur",
  total_cost:"total_cost_eur", eur:"total_cost_eur", coste_total:"total_cost_eur",
  costes:"total_cost_eur", gasto:"total_cost_eur", gastos:"total_cost_eur",
  // maintenance_events
  maintenance:"maintenance_events", mantenimiento:"maintenance_events",
  eventos_mantenimiento:"maintenance_events", maint:"maintenance_events",
  mant:"maintenance_events", mant_eventos:"maintenance_events",
  // total_repair_hours
  repair_hours:"total_repair_hours", horas_reparacion:"total_repair_hours",
  repair:"total_repair_hours", horas_rep:"total_repair_hours",
  // cancelled_trips
  cancelled:"cancelled_trips", cancelaciones:"cancelled_trips",
  cancellations:"cancelled_trips", cancelados:"cancelled_trips",
  viajes_cancelados:"cancelled_trips",
};

function normalizeKey(k: string): string {
  return k.toLowerCase().trim().replace(/[\s\-]+/g, "_");
}

/** Auto-suggest a system field for a raw column name */
function suggestField(rawKey: string): string | null {
  const n = normalizeKey(rawKey);
  if (FLEET_COLUMNS.has(n)) return n;
  return COLUMN_ALIASES[n] ?? null;
}

/** Apply a user-confirmed mapping to a raw row */
function applyMapping(
  raw: Record<string, unknown>,
  mapping: Record<string, string>
): Partial<FleetRow> {
  const result: Partial<FleetRow> = {};
  for (const [rawKey, value] of Object.entries(raw)) {
    const target = mapping[rawKey];
    if (target && target !== "ignore" && FLEET_COLUMNS.has(target)) {
      (result as any)[target] = value;
    }
  }
  return result;
}

/** Auto-detect mapping from raw rows (fallback when no user mapping provided) */
function autoNormalizeRow(raw: Record<string, unknown>): Partial<FleetRow> {
  const result: Partial<FleetRow> = {};
  for (const [rawKey, value] of Object.entries(raw)) {
    const target = suggestField(rawKey);
    if (target && !(target in result)) (result as any)[target] = value;
  }
  return result;
}

// ── KPI helpers ──────────────────────────────────────────────────────────────
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const r2 = (n: number) => Math.round(n * 100) / 100;

function calcKpis(row: Partial<FleetRow>): Kpis {
  const me = Number(row.maintenance_events)   || 0;
  const tt = Number(row.total_trips)          || 1;
  const ha = Number(row.hours_available)      || 0;
  const hp = Number(row.hours_with_passenger) || 0;
  const tv = Number(row.total_vehicles)       || 1;
  const vo = Number(row.vehicles_operational) || 0;
  const km = Number(row.total_km)             || 0;
  const ct = Number(row.total_cost_eur)       || 0;
  const rh = Number(row.total_repair_hours)   || 0;
  const ca = Number(row.cancelled_trips)      || 0;
  return {
    tasa_utilizacion:   ha > 0 ? r4(hp / ha)        : 0,
    fleet_availability: tv > 0 ? r4(vo / tv)        : 0,
    mttr_horas:         me > 0 ? r4(rh / me)        : 0,
    cost_per_km:        km > 0 ? r4(ct / km)        : 0,
    on_time_rate:       tt > 0 ? r4((tt - ca) / tt) : 0,
    revenue_proxy:      r4(tt * (hp / Math.max(tt, 1)) * 18),
  };
}

function calcBaseline(rows: Partial<FleetRow>[]): Kpis {
  if (!rows.length) return { tasa_utilizacion:0, fleet_availability:0, mttr_horas:0, cost_per_km:0, on_time_rate:0, revenue_proxy:0 };
  const all = rows.map(calcKpis);
  const n   = all.length;
  return {
    tasa_utilizacion:   r4(all.reduce((s, r) => s + r.tasa_utilizacion,   0) / n),
    fleet_availability: r4(all.reduce((s, r) => s + r.fleet_availability, 0) / n),
    mttr_horas:         r4(all.reduce((s, r) => s + r.mttr_horas,         0) / n),
    cost_per_km:        r4(all.reduce((s, r) => s + r.cost_per_km,        0) / n),
    on_time_rate:       r4(all.reduce((s, r) => s + r.on_time_rate,       0) / n),
    revenue_proxy:      r4(all.reduce((s, r) => s + r.revenue_proxy,      0) / n),
  };
}

function detectAnomalies(today: Kpis, baseline: Kpis, threshold = 0.10): Anomaly[] {
  const results: Anomaly[] = [];
  for (const kpi of Object.keys(today) as (keyof Kpis)[]) {
    const base = baseline[kpi];
    if (!base) continue;
    const pct = ((today[kpi] - base) / base) * 100;
    if (Math.abs(pct) <= 5) continue;
    results.push({
      kpi, valor_hoy: r4(today[kpi]), valor_baseline: r4(base),
      desviacion_pct: r2(pct),
      direccion: pct < 0 ? "bajada" : "subida",
      critico: Math.abs(pct) > threshold * 100,
    });
  }
  return results.sort((a, b) => Math.abs(b.desviacion_pct) - Math.abs(a.desviacion_pct));
}

// ── DeepSeek ─────────────────────────────────────────────────────────────────
async function generateBriefing(city: string, date: string, today: Kpis, baseline: Kpis, anomalies: Anomaly[]) {
  const res = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "Eres analista experto en operaciones de flotas VTC. Responde ÚNICAMENTE con el JSON solicitado, sin markdown." },
      { role: "user", content: `Ciudad: ${city} | Fecha: ${date}\nKPIs hoy: ${JSON.stringify(today)}\nBaseline (7 días): ${JSON.stringify(baseline)}\nAnomalías (${anomalies.length}): ${JSON.stringify(anomalies)}\n\nDevuelve ÚNICAMENTE este JSON:\n{"resumen":"2-3 frases en español","alertas":["alerta 1"],"recomendacion":"acción concreta","prioridad":"alta|media|baja"}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  return JSON.parse(res.choices[0].message.content || "{}");
}

// ── File parser ──────────────────────────────────────────────────────────────
async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".csv")) {
    const result = Papa.parse<Record<string, unknown>>(buffer.toString("utf-8"), {
      header: true, dynamicTyping: true, skipEmptyLines: true,
    });
    return result.data;
  }
  const wb  = XLSX.read(buffer, { type: "buffer" });
  const all: Record<string, unknown>[] = [];
  for (const sheetName of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
    if (data.length && !("city" in data[0])) data.forEach(r => { r.city = sheetName; });
    all.push(...data);
  }
  return all;
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const isPreview = req.nextUrl.searchParams.get("preview") === "true";

    const formData  = await req.formData();
    const file      = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se ha proporcionado ningún archivo." }, { status: 400 });

    const rawRows = await parseFile(file);
    if (!rawRows.length) return NextResponse.json({ error: "El archivo está vacío o no tiene datos válidos." }, { status: 400 });

    const rawKeys = Object.keys(rawRows[0]);

    // ── PREVIEW MODE: return column names + auto-mapping suggestions ──────────
    if (isPreview) {
      const suggestions = rawKeys.map(col => ({
        fileColumn:           col,
        suggestedSystemField: suggestField(col),
      }));
      return NextResponse.json({ columns: rawKeys, suggestions, totalRows: rawRows.length });
    }

    // ── FULL ANALYSIS MODE ────────────────────────────────────────────────────
    // Prefer user-provided mapping, fall back to auto-detection
    const mappingJson  = formData.get("mapping") as string | null;
    const userMapping: Record<string, string> = mappingJson ? JSON.parse(mappingJson) : {};
    const hasUserMapping = Object.keys(userMapping).length > 0;

    const rows = rawRows.map(raw =>
      hasUserMapping ? applyMapping(raw, userMapping) : autoNormalizeRow(raw)
    );

    // Validate required columns
    const firstRow = rows[0] ?? {};
    const missingRequired = (["date","city"] as (keyof FleetRow)[]).filter(c => !(c in firstRow));
    if (missingRequired.length > 0) {
      return NextResponse.json({
        error: `Columnas requeridas no mapeadas: ${missingRequired.join(", ")}`,
        missing_columns: missingRequired,
        found_columns:   rawKeys,
        hint: `Asegúrate de mapear las columnas "date" y "city" en el paso de mapeo.`,
      }, { status: 400 });
    }

    // Warnings for missing KPI columns
    const KPI_COLS: (keyof FleetRow)[] = ["total_vehicles","vehicles_operational","total_trips","hours_available","hours_with_passenger","total_km","total_cost_eur","maintenance_events","total_repair_hours","cancelled_trips"];
    const missingKpi = KPI_COLS.filter(c => !(c in firstRow));
    const warnings: string[] = missingKpi.length > 0
      ? [`KPIs calculados con 0 por columnas no mapeadas: ${missingKpi.join(", ")}`]
      : [];

    const allDates   = [...new Set(rows.map(r => String(r.date || "")))].sort();
    const targetDate = allDates[allDates.length - 1];
    const cities     = [...new Set(rows.map(r => String(r.city || "")))].filter(Boolean);

    const briefings = await Promise.all(
      cities.map(async city => {
        const cityRows   = rows.filter(r => String(r.city) === city);
        const todayRow   = cityRows.find(r => String(r.date) === targetDate);
        if (!todayRow) return null;
        const today      = calcKpis(todayRow);
        const history    = cityRows.filter(r => String(r.date) < targetDate).slice(-7);
        const baseline   = calcBaseline(history);
        const anomalies  = detectAnomalies(today, baseline);
        const ds         = await generateBriefing(city, targetDate, today, baseline, anomalies);
        return {
          id: `upload-${city}-${targetDate}`, date: targetDate, city,
          resumen: ds.resumen || "", alertas: ds.alertas || [],
          recomendacion: ds.recomendacion || "", prioridad: ds.prioridad || "desconocida",
          kpis_today: today, kpis_baseline: baseline, anomalies,
          anomalies_count: anomalies.length, created_at: new Date().toISOString(),
        };
      })
    );

    const valid = briefings.filter(Boolean);
    return NextResponse.json({ briefings: valid, date: targetDate, cities_analyzed: valid.length, warnings });

  } catch (err: any) {
    console.error("[/api/analyze]", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
