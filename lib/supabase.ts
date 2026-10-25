import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** 브라우저용 (읽기 + Realtime 구독) */
export const supabase = createClient(url, anon);

/** 서버 전용 (쓰기). API Route에서만 사용 */
export function supabaseAdmin() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export type ServoLog = {
  id: number;
  servo_id: number;
  angle: number;
  target: number | null;
  current_ma: number | null;
  temp_c: number | null;
  recorded_at: string;
};

export type ServoLatest = {
  servo_id: number;
  name: string;
  angle: number;
  target: number | null;
  current_ma: number | null;
  temp_c: number | null;
  recorded_at: string;
};

export type Command = {
  id: number;
  servo_id: number;
  target: number;
  speed: number;
  status: "pending" | "sent" | "done" | "failed";
  created_at: string;
};
