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
      setMsg(r.ok ? `Command #${j.command.id} sent → ${j.command.target}°` : `Error: ${j.error}`);
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!servo) return <div className="empty">Select a servo on the left.</div>;

  return (
    <div className="control">
      <label><span>Target angle</span><span>{target}°</span></label>
      <input type="range" min={0} max={180} step={1} value={target} onChange={(e) => setTarget(+e.target.value)} />
      <label><span>Speed</span><span>{speed.toFixed(2)}</span></label>
      <input type="range" min={0.1} max={1} step={0.05} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
      <div className="btns">
        <button onClick={send} disabled={busy}>Move</button>
        <button className="ghost" onClick={() => setTarget(90)}>Center (90°)</button>
        <button className="ghost" onClick={() => setTarget(Math.round(servo.angle))}>Current</button>
      </div>
      <div className="toast">{msg}</div>

      <h2 style={{ marginTop: 8 }}>Recent Commands</h2>
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
