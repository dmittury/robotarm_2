import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/telemetry
 * Header:  x-robot-key: <ROBOT_API_KEY>
 * Body:    { "readings": [ { "servo_id": 0, "angle": 90.5, "target": 90, "current_ma": 120, "temp_c": 31 }, ... ] }
 *   또는   { "servo_id": 0, "angle": 90.5 }  (단일)
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("x-robot-key") !== process.env.ROBOT_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad json" }, { status: 400 });

  const readings = Array.isArray(body.readings) ? body.readings : [body];
  const rows = readings
    .filter((r: any) => Number.isFinite(r?.servo_id) && Number.isFinite(r?.angle))
    .map((r: any) => ({
      servo_id: r.servo_id,
      angle: r.angle,
      target: r.target ?? null,
      current_ma: r.current_ma ?? null,
      temp_c: r.temp_c ?? null,
      recorded_at: r.recorded_at ?? new Date().toISOString(),
    }));
  if (rows.length === 0) return NextResponse.json({ error: "no readings" }, { status: 400 });

  const { error } = await supabaseAdmin().from("servo_logs").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, inserted: rows.length });
}
