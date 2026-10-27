"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type Command, type ServoLatest, type ServoLog } from "@/lib/supabase";
import ServoList from "@/components/ServoList";
import ControlPanel from "@/components/ControlPanel";
import ServoChart from "@/components/ServoChart";

export default function Page() {
  const [servos, setServos] = useState<ServoLatest[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [logs, setLogs] = useState<ServoLog[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [minutes, setMinutes] = useState(10);
  const [live, setLive] = useState(false);
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selected;

  const loadLatest = useCallback(async () => {
    const { data } = await supabase.from("servo_latest").select("*").order("servo_id");
    if (data) {
      setServos(data as ServoLatest[]);
      if (selectedRef.current === null && data.length) setSelected(data[0].servo_id);
    }
  }, []);

  const loadLogs = useCallback(async (id: number, mins: number) => {
    const since = new Date(Date.now() - mins * 60_000).toISOString();
    const { data } = await supabase
      .from("servo_logs").select("*")
      .eq("servo_id", id).gte("recorded_at", since)
      .order("recorded_at", { ascending: true }).limit(2000);
    setLogs((data ?? []) as ServoLog[]);
  }, []);

  const loadCommands = useCallback(async () => {
    const { data } = await supabase.from("commands").select("*").order("created_at", { ascending: false }).limit(50);
    setCommands((data ?? []) as Command[]);
  }, []);

  useEffect(() => { loadLatest(); loadCommands(); }, [loadLatest, loadCommands]);
  useEffect(() => { if (selected !== null) loadLogs(selected, minutes); }, [selected, minutes, loadLogs]);

  // Realtime: 새 로그 / 명령 상태 변경을 즉시 반영
  useEffect(() => {
    const ch = supabase
      .channel("robotarm")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "servo_logs" }, (p) => {
        const row = p.new as ServoLog;
        setServos((prev) => {
          const i = prev.findIndex((s) => s.servo_id === row.servo_id);
          if (i < 0) { loadLatest(); return prev; }
          const next = [...prev];
          next[i] = { ...next[i], angle: row.angle, target: row.target, current_ma: row.current_ma, temp_c: row.temp_c, recorded_at: row.recorded_at };
          return next;
        });
        if (row.servo_id === selectedRef.current) setLogs((prev) => [...prev, row].slice(-2000));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "commands" }, () => loadCommands())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(ch); };
  }, [loadLatest, loadCommands]);

  const current = servos.find((s) => s.servo_id === selected) ?? null;

  return (
    <main className="app">
      <div className="header">
        <div>
          <h1>Robot Arm Console</h1>
          <div className="sub">Remote servo control · Live position · Quadratic trend analysis</div>
        </div>
        <div className="sub"><span className={"status-dot" + (live ? " live" : "")} />{live ? "Realtime connected" : "Connecting…"}</div>
      </div>

      <div className="grid">
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <section className="panel">
            <h2>Motor Status</h2>
            <ServoList servos={servos} selected={selected} onSelect={setSelected} />
          </section>
          <section className="panel">
            <h2>Remote Control</h2>
            <ControlPanel servo={current} commands={commands} />
          </section>
        </div>
        <section className="panel">
          <h2>Data Analysis</h2>
          <ServoChart logs={logs} servoName={current?.name ?? "-"} minutes={minutes} onMinutes={setMinutes} />
        </section>
      </div>
    </main>
  );
}
