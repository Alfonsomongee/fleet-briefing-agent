import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── DeepSeek client ────────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-d06aa6133a3e4cb1a4f1cfb50fdd218d";

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface FleetRow {
  date: string;
  city: string;
  total_vehicles: number;
  vehicles_operational: number;
  total_trips: number;
  hours_available: number;
  hours_with_passenger: number;
  total_km: number;
  total_cost_eur: number;
  maintenance_events: number;
  total_repair_hours: number;
  cancelled_trips: number;
}

interface Kpis {
  tasa_utilizacion: number;
  fleet_availability: number;
  mttr_horas: number;
  cost_per_km: number;
  on_time_rate: number;
  revenue_proxy: number;
}

interface Anomaly {
  kpi: string;
  valor_hoy: number;
  valor_baseline: number;
  desviacion_pct: number;
  direccion: "subida" | "bajada";
  critico: boolean;
}

// ── KPI helpers ───────────────────────────────────────────────────────────────
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const r2 = (n: number) => Math.round(n * 100) / 100;

function calcKpis(row: FleetRow): Kpis {
  const me = Number(row.maintenance_events) || 0;
  const tt = Number(row.total_trips) || 1;
  const ha = Number(row.hours_available) || 0;
  const hp = Number(row.hours_with_passenger) || 0;
  const tv = Number(row.total_vehicles) || 1;
  const vo = Number(row.vehicles_operational) || 0;
  const km = Number(row.total_km) || 0;
  const ct = Number(row.total_cost_eur) || 0;
  const rh = Number(row.total_repair_hours) || 0;
  const ca = Number(row.cancelled_trips) || 0;

  return {
    tasa_utilizacion:  ha > 0  ? r4(hp / ha)         : 0,
    fleet_availability: tv > 0 ? r4(vo / tv)         : 0,
    mttr_horas:        me > 0  ? r4(rh / me)         : 0,
    cost_per_km:       km > 0  ? r4(ct / km)         : 0,
    on_time_rate:      tt > 0  ? r4((tt - ca) / tt)  : 0,
    revenue_proxy:     r4(tt * (hp / tt) * 18),
  };
}

function calcBaseline(rows: FleetRow[]): Kpis {
  if (!rows.length) {
    return { tasa_utilizacion: 0, fleet_availability: 0, mttr_horas: 0, cost_per_km: 0, on_time_rate: 0, revenue_proxy: 0 };
  }
  const all = rows.map(calcKpis);
  const keys = Object.keys(all[0]) as (keyof Kpis)[];
  return Object.fromEntries(
    keys.map((k) => [k, r4(all.reduce((s, r) => s + r[k], 0) / all.length)])
  ) as unknown as Kpis;
}

function detectAnomalies(today: Kpis, baseline: Kpis, threshold = 0.10): Anomaly[] {
  const results: Anomaly[] = [];
  for (const kpi of Object.keys(today) as (keyof Kpis)[]) {
    const base = baseline[kpi];
    if (!base) continue;
    const pct = ((today[kpi] - base) / base) * 100;
    if (Math.abs(pct) <= 5) continue;
    results.push({
      kpi,
      valor_hoy:       r4(today[kpi]),
      valor_baseline:  r4(base),
      desviacion_pct:  r2(pct),
      direccion:       (pct < 0 ? "bajada" : "subida") as "bajada" | "subida",
      critico:         Math.abs(pct) > threshold * 100,
    });
  }
  return results.sort((a, b) => Math.abs(b.desviacion_pct) - Math.abs(a.desviacion_pct));
}

// ── DeepSeek call ─────────────────────────────────────────────────────────────
async function generateBriefing(
  city: string,
  date: string,
  today: Kpis,
  baseline: Kpis,
  anomalies: Anomaly[]
) {
  const prompt = `Ciudad: ${city} | Fecha: ${date}

KPIs hoy: ${JSON.stringify(today)}
Baseline (7 días): ${JSON.stringify(baseline)}
Anomalías detectadas (${anomalies.length}): ${JSON.stringify(anomalies)}

Devuelve ÚNICAMENTE este JSON sin texto adicional:
{
  "resumen": "2-3 frases en español explicando la situación operativa de hoy",
  "alertas": ["alerta concisa 1", "alerta concisa 2"],
  "recomendacion": "una acción operativa concreta",
  "prioridad": "alta | media | baja"
}`;

  const res = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: "Eres un analista experto en operaciones de flotas VTC. Responde ÚNICAMENTE con el JSON solicitado, sin markdown." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  return JSON.parse(res.choices[0].message.content || "{}");
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se ha proporcionado ningún archivo." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: FleetRow[] = [];

    if (file.name.toLowerCase().endsWith(".csv")) {
      // Parse CSV
      const text = buffer.toString("utf-8");
      const result = Papa.parse<FleetRow>(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      rows = result.data;
    } else {
      // Parse Excel (.xlsx / .xls)
      const wb = XLSX.read(buffer, { type: "buffer" });
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(ws);
        // If there's no 'city' column, use the sheet name as city
        if (data.length && !("city" in data[0])) {
          data.forEach((r: any) => { r.city = sheetName; });
        }
        rows.push(...(data as FleetRow[]));
      }
    }

    if (!rows.length) {
      return NextResponse.json({ error: "El archivo está vacío o no tiene datos válidos." }, { status: 400 });
    }

    // Determine the target date (latest date in the file)
    const allDates = [...new Set(rows.map((r) => String(r.date)))].sort();
    const targetDate = allDates[allDates.length - 1];

    // Get unique cities
    const cities = [...new Set(rows.map((r) => String(r.city)))];

    // Process each city in parallel
    const briefings = await Promise.all(
      cities.map(async (city) => {
        const cityRows = rows.filter((r) => String(r.city) === city);
        const todayRow = cityRows.find((r) => String(r.date) === targetDate);
        if (!todayRow) return null;

        const today    = calcKpis(todayRow);
        const history  = cityRows.filter((r) => String(r.date) < targetDate).slice(-7);
        const baseline = calcBaseline(history);
        const anomalies = detectAnomalies(today, baseline);

        const deepseekResult = await generateBriefing(city, targetDate, today, baseline, anomalies);

        return {
          id:              `upload-${city}-${targetDate}`,
          date:            targetDate,
          city,
          resumen:         deepseekResult.resumen    || "",
          alertas:         deepseekResult.alertas    || [],
          recomendacion:   deepseekResult.recomendacion || "",
          prioridad:       deepseekResult.prioridad  || "desconocida",
          kpis_today:      today,
          kpis_baseline:   baseline,
          anomalies,
          anomalies_count: anomalies.length,
          created_at:      new Date().toISOString(),
        };
      })
    );

    const valid = briefings.filter(Boolean);

    return NextResponse.json({
      briefings: valid,
      date: targetDate,
      cities_analyzed: valid.length,
    });
  } catch (err: any) {
    console.error("[/api/analyze]", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
