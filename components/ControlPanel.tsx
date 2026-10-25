"use client";
import { useEffect, useState } from "react";
import type { Command, ServoLatest } from "@/lib/supabase";

type Props = { servo: ServoLatest | null; commands: Command[] };

export default function ControlPanel({ servo, commands }: Props) {
  const [target, setTarget] = useState(90);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (servo) setTarget(Math.round(servo.target ?? servo.angle));
  }, [servo?.servo_id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!servo) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/commands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ servo_id: servo.servo_id, target, speed }),
      });
      const j = await r.json();
      setMsg(r.ok ? `명령 #${j.command.id} 전송됨 → ${j.command.target}°` : `오류: ${j.error}`);
    } catch (e: any) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!servo) return <div className="empty">왼쪽에서 서보를 선택하세요.</div>;

  return (
    <div className="control">
      <label><span>목표 각도</span><span>{target}°</span></label>
      <input type="range" min={0} max={180} step={1} value={target} onChange={(e) => setTarget(+e.target.value)} />
      <label><span>속도</span><span>{speed.toFixed(2)}</span></label>
      <input type="range" min={0.1} max={1} step={0.05} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
      <div className="btns">
        <button onClick={send} disabled={busy}>이동</button>
        <button className="ghost" onClick={() => setTarget(90)}>센터(90°)</button>
        <button className="ghost" onClick={() => setTarget(Math.round(servo.angle))}>현재값</button>
      </div>
      <div className="toast">{msg}</div>

      <h2 style={{ marginTop: 8 }}>최근 명령</h2>
      <div className="cmd-list">
        {commands.filter((c) => c.servo_id === servo.servo_id).slice(0, 8).map((c) => (
          <div key={c.id}>
            <span>#{c.id} → {c.target}° @{c.speed}</span>
            <span className={"st-" + c.status}>{c.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
