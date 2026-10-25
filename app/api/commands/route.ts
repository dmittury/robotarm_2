import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/commands        (대시보드 → 명령 큐에 넣기)
 *   Body: { servo_id: 1, target: 120, speed?: 0.5 }
 *
 * GET  /api/commands?status=pending   (로봇이 폴링)
 *   Header: x-robot-key
 *   → pending 명령을 반환하고 status를 'sent'로 바꿈
 *
 * PATCH /api/commands      (로봇이 완료 보고)
 *   Header: x-robot-key
 *   Body: { id: 12, status: "done" | "failed" }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const servo_id = Number(body?.servo_id);
  const target = Number(body?.target);
  const speed = body?.speed == null ? 1 : Number(body.speed);
  if (!Number.isFinite(servo_id) || !Number.isFinite(target)) {
    return NextResponse.json({ error: "servo_id, target required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data: servo } = await db.from("servos").select("min_angle,max_angle").eq("id", servo_id).single();
  if (!servo) return NextResponse.json({ error: "unknown servo" }, { status: 404 });
  const clamped = Math.min(servo.max_angle, Math.max(servo.min_angle, target));

  const { data, error } = await db
    .from("commands")
    .insert({ servo_id, target: clamped, speed })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, command: data });
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-robot-key") !== process.env.ROBOT_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("commands")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data.length) {
    await db
      .from("commands")
      .update({ status: "sent" })
      .in("id", data.map((c) => c.id));
  }
  return NextResponse.json({ commands: data });
}

export async function PATCH(req: NextRequest) {
  if (req.headers.get("x-robot-key") !== process.env.ROBOT_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  const status = body?.status;
  if (!Number.isFinite(id) || !["done", "failed"].includes(status)) {
    return NextResponse.json({ error: "id, status(done|failed) required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("commands")
    .update({ status, acked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
