import { NextResponse } from "next/server";
import { createServerClient } from "../../lib/supabase";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("briefings")
      .select("date")
      .order("date", { ascending: false })
      .limit(35); // up to 7 dates × 5 cities

    if (error) throw error;

    // Deduplicate dates
    const dates = [...new Set((data || []).map((r: any) => r.date))].slice(0, 7);
    return NextResponse.json({ dates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
