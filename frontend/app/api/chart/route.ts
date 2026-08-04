import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-d06aa6133a3e4cb1a4f1cfb50fdd218d";

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(req: NextRequest) {
  try {
    const { briefings, prompt } = await req.json();

    // Build a compact data context for DeepSeek
    const dataContext = briefings.map((b: any) => ({
      city: b.city,
      prioridad: b.prioridad,
      anomalies_count: b.anomalies_count,
      kpis_today: b.kpis_today,
      kpis_baseline: b.kpis_baseline,
    }));

    const systemPrompt = `Eres un analista de datos de flotas VTC especializado en visualizaciones.
Dado un conjunto de KPIs por ciudad y una solicitud del usuario, genera la configuración de una gráfica de barras.

KPIs disponibles por ciudad (kpis_today y kpis_baseline):
- tasa_utilizacion (0-1): MULTIPLICAR x100 para obtener porcentaje
- fleet_availability (0-1): MULTIPLICAR x100 para obtener porcentaje
- mttr_horas (h): valor directo
- cost_per_km (€/km): valor directo
- on_time_rate (0-1): MULTIPLICAR x100 para obtener porcentaje
- revenue_proxy (€): valor directo
- anomalies_count (entero): número de anomalías detectadas

Devuelve ÚNICAMENTE este JSON sin ningún texto adicional:
{
  "title": "Título descriptivo de la gráfica (max 55 caracteres)",
  "data": [{"name": "Ciudad", "Hoy": valor_numerico, "Base 7d": valor_numerico}],
  "y_keys": ["Hoy", "Base 7d"],
  "summary": "1-2 frases explicando qué muestra la gráfica y cuál es la conclusión principal.",
  "y_unit": "unidad (%, h, €, €/km, o vacío si no aplica)"
}

Los valores numéricos en data.[] deben ser ya convertidos (porcentajes ya en %, no en 0-1).
Redondea a máximo 2 decimales.`;

    const userPrompt = `Datos de la flota:
${JSON.stringify(dataContext, null, 2)}

Solicitud del usuario: "${prompt}"`;

    const res = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(res.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/chart]", err);
    return NextResponse.json(
      { error: err.message || "Error interno al generar la gráfica" },
      { status: 500 }
    );
  }
}
