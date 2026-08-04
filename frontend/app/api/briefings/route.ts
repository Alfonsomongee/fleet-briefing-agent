import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "../../lib/supabase";

export async function GET(req: NextRequest) {
  const date =
    req.nextUrl.searchParams.get("date") ||
    new Date().toISOString().split("T")[0];

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("briefings")
      .select("*")
      .eq("date", date)
      .order("city");

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: `No briefings found for ${date}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ date, briefings: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
