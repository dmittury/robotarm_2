import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/servos                 → 서보별 최신 상태
 * GET /api/servos?id=1&minutes=10 → 해당 서보의 최근 N분 로그 (분석용)
 */
export async function GET(req: NextRequest) {
  const db = supabaseAdmin();
  const id = req.nextUrl.searchParams.get("id");

  if (id === null) {
    const { data, error } = await db.from("servo_latest").select("*").order("servo_id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ servos: data });
  }

  const minutes = Number(req.nextUrl.searchParams.get("minutes") ?? 10);
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await db
    .from("servo_logs")
    .select("*")
    .eq("servo_id", Number(id))
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data });
}
