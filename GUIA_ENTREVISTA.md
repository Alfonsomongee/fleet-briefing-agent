# Fleet Briefing Agent — Guía completa

## Qué hace el agente (explicación simple)

Cada mañana, el agente:
1. Carga datos de una flota de vehículos (coches, furgonetas, etc.)
2. Calcula 6 KPIs operativos para cada ciudad
3. Los compara contra la media de los últimos 7 días
4. Detecta anomalías (subidas o bajadas fuera de lo normal)
5. Le pide a una IA (DeepSeek) que redacte un briefing en español
6. Guarda el resultado en una base de datos
7. Lo muestra en un dashboard web en tiempo real

---

## De dónde vienen los datos

Ahora mismo el agente usa **datos simulados** (90 días de CSV generado con `generate_sample_data.py`). Cada fila tiene:

| Campo | Descripción |
|-------|-------------|
| date | Fecha |
| city | Ciudad (Madrid, Barcelona, Valencia, Sevilla) |
| total_vehicles | Total de vehículos de la flota |
| vehicles_operational | Vehículos disponibles ese día |
| total_trips | Viajes realizados |
| hours_with_passenger | Horas con pasajero |
| total_km | Kilómetros recorridos |
| total_cost_eur | Coste total (combustible + mantenimiento) |
| maintenance_events | Incidencias de mantenimiento |
| total_repair_hours | Horas invertidas en reparaciones |
| cancelled_trips | Viajes cancelados |

**En un caso real**, este CSV se sustituiría por:
- Una base de datos SQL (PostgreSQL, MySQL) del sistema de gestión de flota
- Un Excel exportado del ERP
- Un PDF de informe operativo

El código ya soporta los cuatro formatos — solo cambia `DATA_SOURCE` en `.env`.

---

## Los 6 KPIs que calcula

| KPI | Fórmula | Qué mide |
|-----|---------|----------|
| Tasa de utilización | horas_con_pasajero / horas_disponibles | Qué porcentaje del tiempo los coches están activos |
| Disponibilidad flota | vehículos_operativos / total_vehículos | Qué % de la flota está lista para operar |
| MTTR (horas) | horas_reparación / nº_incidencias | Tiempo medio para reparar un vehículo |
| Coste por km | coste_total / km_totales | Eficiencia de costes |
| Tasa de puntualidad | (viajes - cancelados) / viajes | Fiabilidad del servicio |
| Revenue proxy | viajes × horas_por_viaje × 18€ | Estimación de ingresos |

---

## Cómo detecta anomalías

Compara el KPI de hoy contra la media de los últimos 7 días:

```
desviación = (hoy - baseline) / baseline × 100
```

- Si la desviación es **> 5%** → aparece como alerta
- Si la desviación es **> 10%** → se marca como **crítica**
- La prioridad del briefing (alta/media/baja) depende del número de anomalías críticas

Ejemplo real del dashboard de hoy:
- Barcelona MTTR +49.2% → crítico → prioridad **alta**
- Sevilla utilización +17.1% → alerta positiva → prioridad **media**

---

## Arquitectura técnica

```
┌─────────────────────────────────────────┐
│  GitHub Actions (cron 07:00 UTC L-V)   │
│                                         │
│  python main.py                         │
│    → genera KPIs                        │
│    → detecta anomalías                  │
│    → llama DeepSeek API                 │
│    → guarda en Supabase                 │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Supabase (PostgreSQL)                  │
│  tabla: briefings                       │
│  columnas: date, city, resumen,         │
│            alertas, kpis_today,         │
│            anomalies, prioridad...      │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Vercel (Next.js 14)                    │
│  fleet-briefing-agent.vercel.app        │
│                                         │
│  Lee Supabase directamente              │
│  Muestra cards por ciudad               │
│  Badge rojo/ámbar/verde por prioridad   │
│  Tabla KPIs con delta vs baseline       │
└─────────────────────────────────────────┘
```

**Stack completo:**
- Python 3.11 + pandas → procesamiento de datos
- DeepSeek API (deepseek-chat) → generación de texto
- Supabase (PostgreSQL) → persistencia
- Next.js 14 + Tailwind → dashboard
- Vercel → hosting frontend
- GitHub Actions → automatización del agente

---

## Cómo se actualizan los datos

1. **Automático:** GitHub Actions ejecuta `python main.py` cada día laborable a las 07:00 UTC
2. **Manual:** puedes lanzarlo en cualquier momento desde GitHub → Actions → Run workflow
3. **Local:** `python main.py --date 2026-08-04` desde la carpeta `backend/`

El dashboard de Vercel revalida los datos cada 5 minutos automáticamente (ISR de Next.js).

---

## Cómo presentarlo en la entrevista

### Script de demo (3 minutos)

**1. Abre el dashboard** → https://fleet-briefing-agent.vercel.app

> "Este es el resultado de un agente que corre automáticamente cada mañana.
> Analiza los KPIs operativos de una flota de vehículos en 4 ciudades,
> detecta anomalías respecto a la media de los últimos 7 días,
> y genera un briefing en lenguaje natural usando DeepSeek."

**2. Señala la tabla de resumen** (parte superior)

> "En un vistazo, el equipo de operaciones sabe qué ciudades tienen problemas críticos hoy.
> Barcelona y Madrid tienen prioridad alta — hay anomalías en MTTR y utilización."

**3. Abre la card de Barcelona**

> "El agente no solo detecta la anomalía: explica qué pasó y da una recomendación concreta.
> El MTTR ha subido un 49%, los ingresos han caído un 23%. La recomendación:
> priorizar la reducción del tiempo de reparación."

**4. Expande 'KPIs detallados'**

> "Y aquí están los números exactos: hoy vs baseline de 7 días, con el delta en verde o rojo."

**5. Menciona la automatización**

> "Todo esto corre solo — GitHub Actions lo lanza cada mañana a las 7 UTC.
> En producción, en vez de CSV simulado, conectaría directamente a la base de datos
> del sistema de gestión de flota."

---

### Preguntas frecuentes en entrevistas técnicas

**¿Por qué DeepSeek en vez de GPT-4?**
> Menor coste por token, API compatible con OpenAI (mismo código), y suficiente para
> tareas de análisis estructurado. Cambiar el modelo es solo una variable de entorno.

**¿Cómo escalaría esto a más ciudades o más datos?**
> El pipeline es stateless por ciudad — añadir ciudades es automático, aparecen solas
> en el dashboard. Para datos masivos, añadiría paralelización con `concurrent.futures`.

**¿Qué pasaría si el LLM falla?**
> Hay manejo de errores explícito — si la API falla, guarda un briefing de error con
> prioridad "desconocida" y el proceso continúa. Los KPIs siempre se calculan,
> el LLM solo genera el texto.

**¿Por qué Supabase y no una BD propia?**
> Para un MVP/demo, Supabase da PostgreSQL gestionado, RLS, y API REST lista en minutos.
> En producción podría migrar a cualquier PostgreSQL sin cambiar código.

---

## Posibles mejoras para mencionar

- **Integración con datos reales:** conectar directamente al ERP de la empresa vía SQL
- **Alertas proactivas:** enviar el briefing por email o Slack cuando hay prioridad alta
- **API REST:** endpoint FastAPI para integrar el briefing en otros sistemas
- **Histórico:** gráficos de tendencia de cada KPI en el tiempo
- **Subida de archivos:** subir un Excel o PDF y obtener el análisis al instante
