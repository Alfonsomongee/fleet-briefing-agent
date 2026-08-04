export interface Kpis {
  tasa_utilizacion:   number;
  fleet_availability: number;
  mttr_horas:         number;
  cost_per_km:        number;
  on_time_rate:       number;
  revenue_proxy:      number;
}

export interface Briefing {
  id:              string;
  date:            string;
  city:            string;
  resumen:         string;
  alertas:         string[];
  recomendacion:   string;
  prioridad:       "alta" | "media" | "baja" | "desconocida";
  kpis_today?:     Partial<Kpis>;
  kpis_baseline?:  Partial<Kpis>;
  anomalies?:      unknown[];
  anomalies_count: number;
  created_at:      string;
}
