const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Kpis {
  tasa_utilizacion: number;
  fleet_availability: number;
  mttr_horas: number;
  cost_per_km: number;
  on_time_rate: number;
  revenue_proxy: number;
}

export interface Anomaly {
  kpi: string;
  valor_hoy: number;
  valor_baseline: number;
  desviacion_pct: number;
  direccion: "bajada" | "subida";
  critico: boolean;
}

export interface Briefing {
  id: string;
  date: string;
  city: string;
  resumen: string;
  alertas: string[];
  recomendacion: string;
  prioridad: "alta" | "media" | "baja" | "desconocida";
  kpis_today: Kpis;
  kpis_baseline: Kpis;
  anomalies: Anomaly[];
  anomalies_count: number;
  created_at: string;
}

export async function fetchBriefings(date: string): Promise<Briefing[]> {
  const res = await fetch(`${API_URL}/api/briefings?date=${date}`, {
    next: { revalidate: 300 }, // cache 5 min
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.briefings as Briefing[];
}

export async function fetchDates(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/dates`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.dates as string[];
}
