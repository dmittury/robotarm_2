"use client";
import type { ServoLatest } from "@/lib/supabase";

type Props = {
  servos: ServoLatest[];
  selected: number | null;
  onSelect: (id: number) => void;
};

export default function ServoList({ servos, selected, onSelect }: Props) {
  if (!servos.length) return <div className="empty">아직 수신된 데이터가 없습니다.</div>;
  return (
    <div className="servo-list">
      {servos.map((s) => {
        const pct = Math.max(0, Math.min(100, (s.angle / 180) * 100));
        const tpct = s.target == null ? null : Math.max(0, Math.min(100, (s.target / 180) * 100));
        const age = Math.round((Date.now() - new Date(s.recorded_at).getTime()) / 1000);
        return (
          <div
            key={s.servo_id}
            className={"servo" + (selected === s.servo_id ? " selected" : "")}
            onClick={() => onSelect(s.servo_id)}
          >
            <div className="row">
              <span className="name">#{s.servo_id} {s.name}</span>
              <span className="angle">{s.angle.toFixed(1)}°</span>
            </div>
            <div className="bar">
              <i style={{ width: `${pct}%` }} />
              {tpct != null && <b style={{ left: `${tpct}%` }} title={`target ${s.target}°`} />}
            </div>
            <div className="meta">
              {s.target != null && <span>target {s.target}°</span>}
              {s.current_ma != null && <span>{s.current_ma} mA</span>}
              {s.temp_c != null && <span>{s.temp_c} °C</span>}
              <span style={{ marginLeft: "auto" }}>{age < 60 ? `${age}s ago` : `${Math.round(age / 60)}m ago`}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
