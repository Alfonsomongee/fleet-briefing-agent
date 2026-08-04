# Fleet Briefing Agent

A lightweight AI agent that generates daily operational briefings for vehicle fleets using the DeepSeek API — deployed on Railway (backend) and Vercel (dashboard).

## What it does

- Loads fleet KPIs (utilization rate, MTTR, cost/km, fleet availability, on-time rate)
- Compares today's metrics against a 7-day rolling baseline
- Detects anomalies above a configurable threshold (default: 10%)
- Generates a natural-language briefing per city in Spanish using DeepSeek
- Persists results to Supabase and serves them via a FastAPI REST API
- Renders a live dashboard on Vercel with color-coded priority cards

## Architecture

```
GitHub Actions (cron 07:00 UTC)
        │
        ▼
  Python Agent (Railway)
  ├── DeepSeek API  ──► briefing generation
  ├── Supabase      ──► briefing persistence
  └── FastAPI       ──► REST API

        │  NEXT_PUBLIC_API_URL
        ▼
  Next.js Dashboard (Vercel)
  └── live URL for demos & interviews
```

## Data sources

| Source | How to activate | Notes |
|--------|----------------|-------|
| CSV | `DATA_SOURCE=csv` (default) | For development and demos |
| SQL | `DATA_SOURCE=sql` + `DATABASE_URL` | PostgreSQL, MySQL, SQL Server |
| Excel | `DATA_SOURCE=excel` + `EXCEL_PATH` | Single file or folder; multi-sheet per city |
| PDF | `DATA_SOURCE=pdf` + `PDF_PATH` | Text-based or scanned (OCR fallback) |

## Tech stack

- **Python 3.11+**, FastAPI, pandas — backend agent and API
- **DeepSeek API** (OpenAI-compatible) — LLM inference, no local GPU required
- **Supabase** — PostgreSQL database with row-level security
- **Railway** — backend hosting with built-in cron support
- **Vercel** — Next.js 14 dashboard with ISR
- **GitHub Actions** — CI/CD and scheduled daily runs

## Project structure

```
fleet-briefing-agent/
├── backend/
│   ├── main.py                  # CLI entry point
│   ├── api.py                   # FastAPI REST API
│   ├── requirements.txt
│   ├── railway.toml             # Railway deploy config
│   ├── .env.example
│   ├── data/
│   │   └── generate_sample_data.py
│   ├── output/                  # JSON + HTML reports (gitignored)
│   └── src/
│       ├── data_loader.py       # Unified data source entry point
│       ├── kpi_calculator.py    # 6 operational KPIs
│       ├── anomaly_detector.py  # Deviation detection vs 7-day baseline
│       ├── briefing_agent.py    # DeepSeek LLM integration
│       ├── report_generator.py  # HTML report + JSON export
│       ├── db.py                # Supabase persistence
│       └── connectors/
│           ├── sql_connector.py
│           ├── excel_connector.py
│           └── pdf_connector.py
├── frontend/                    # Next.js 14 dashboard
│   ├── app/
│   │   ├── page.tsx             # Main dashboard page
│   │   ├── layout.tsx
│   │   ├── lib/api.ts           # API client + TypeScript types
│   │   └── components/
│   │       ├── BriefingCard.tsx
│   │       ├── SummaryBar.tsx
│   │       ├── KpiTable.tsx
│   │       └── PriorityBadge.tsx
│   ├── vercel.json
│   └── package.json
├── supabase_migration.sql       # Run once in Supabase SQL editor
├── .github/
│   └── workflows/
│       └── daily_briefing.yml   # Scheduled + manual runs
└── .gitignore
```

## Quick start

```bash
git clone https://github.com/YOUR_USER/fleet-briefing-agent
cd fleet-briefing-agent/backend

python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your DEEPSEEK_API_KEY and Supabase credentials to .env

python main.py --generate-data   # generates 90 days of sample data
python main.py                   # runs today's briefing

# Start the API server
uvicorn api:app --reload
```

## Deploy

**Backend → Railway**
1. Connect your GitHub repo to a new Railway project
2. Set the root directory to `backend/`
3. Add env vars: `DEEPSEEK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
4. Railway will auto-detect `railway.toml` and start the FastAPI server

**Frontend → Vercel**
1. Connect your GitHub repo to a new Vercel project
2. Set the root directory to `frontend/`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app`
4. Deploy — your live dashboard is ready

**Database → Supabase**
1. Create a new Supabase project
2. Open the SQL editor and run `supabase_migration.sql`

**Scheduled runs → GitHub Actions**
1. In your repo Settings → Secrets, add: `DEEPSEEK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
2. The workflow runs automatically at 07:00 UTC Monday–Friday
3. Trigger manually from Actions → Daily Fleet Briefing → Run workflow

## Output example

```
🚗 Fleet Briefing Agent — 2026-08-04
─────────────────────────────────────────────
✅ Madrid       — prioridad: baja     — 0 alertas
⚠️  Barcelona   — prioridad: alta    — 3 alertas
📊 Valencia     — prioridad: media   — 1 alertas
✅ Sevilla      — prioridad: baja    — 0 alertas

─────────────────────────────────────────────
Informe guardado en output/report_2026-08-04.html
```

## Customization

- **Model**: change `DEEPSEEK_MODEL` in `.env` (`deepseek-chat` or `deepseek-reasoner`)
- **Anomaly threshold**: pass `threshold=0.15` to `detect_anomalies()` in `main.py`
- **New cities**: appear automatically from the data — no config needed
- **Data source**: change `DATA_SOURCE` in `.env`

## Roadmap

- [ ] Email delivery of the daily HTML report
- [ ] Chart.js KPI trend lines in the dashboard
- [ ] REST API endpoint to push alerts to Slack
- [ ] Multi-language briefing output
