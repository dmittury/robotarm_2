"use client";
import { useMemo, useState } from "react";
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot,
} from "recharts";
import type { ServoLog } from "@/lib/supabase";
import { fitQuadratic, evalQuadratic, formatEquation, vertex } from "@/lib/regression";

type Props = { logs: ServoLog[]; servoName: string; minutes: number; onMinutes: (m: number) => void };

export default function ServoChart({ logs, servoName, minutes, onMinutes }: Props) {
  const [metric, setMetric] = useState<"angle" | "current_ma" | "temp_c">("angle");

  const { points, curve, fit, vtx } = useMemo(() => {
    if (!logs.length) return { points: [], curve: [], fit: null, vtx: null };
    const t0 = new Date(logs[0].recorded_at).getTime();
    const points = logs
      .filter((l) => l[metric] != null)
      .map((l) => ({ t: (new Date(l.recorded_at).getTime() - t0) / 1000, y: l[metric] as number }));
    const fit = fitQuadratic(points.map((p) => p.t), points.map((p) => p.y));
    let curve: { t: number; fit: number }[] = [];
    let vtx = null;
    if (fit && points.length) {
      const tMax = points[points.length - 1].t;
      const N = 80;
      curve = Array.from({ length: N + 1 }, (_, i) => {
        const t = (tMax * i) / N;
        return { t, fit: evalQuadratic(fit, t) };
      });
      const v = vertex(fit);
      if (v && v.x >= 0 && v.x <= tMax) vtx = v;
    }
    return { points, curve, fit, vtx };
  }, [logs, metric]);

  const unit = metric === "angle" ? "°" : metric === "current_ma" ? " mA" : " °C";

  return (
    <div>
      <div className="chart-head">
        <div>
          <strong style={{ textTransform: "capitalize" }}>{servoName}</strong>
          <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: 8 }}>{points.length} samples</span>
        </div>
        <div className="range">
          {(["angle", "current_ma", "temp_c"] as const).map((m) => (
            <button key={m} className={"ghost" + (metric === m ? " on" : "")} onClick={() => setMetric(m)}>
              {m === "angle" ? "각도" : m === "current_ma" ? "전류" : "온도"}
            </button>
          ))}
          <span style={{ width: 8 }} />
          {[1, 5, 10, 30, 60].map((m) => (
            <button key={m} className={"ghost" + (minutes === m ? " on" : "")} onClick={() => onMinutes(m)}>
              {m}m
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <div className="empty">선택한 구간에 데이터가 없습니다.</div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#262b36" strokeDasharray="3 3" />
            <XAxis
              dataKey="t" type="number" domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${Math.round(v)}s`} stroke="#8b93a7" fontSize={12}
              label={{ value: "경과 시간 (s)", position: "insideBottom", offset: -4, fill: "#8b93a7", fontSize: 12 }}
            />
            <YAxis stroke="#8b93a7" fontSize={12} tickFormatter={(v) => `${v}${unit.trim()}`} width={56} />
            <Tooltip
              contentStyle={{ background: "#171a21", border: "1px solid #262b36", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name) => [`${Number(v).toFixed(2)}${unit}`, name === "y" ? "측정값" : "2차 회귀"]}
              labelFormatter={(v) => `${Number(v).toFixed(2)} s`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "y" ? "측정값" : "2차 함수 추세선")} />
            <Scatter data={points} dataKey="y" fill="#4f8cff" fillOpacity={0.8} />
            {curve.length > 0 && (
              <Line data={curve} dataKey="fit" type="monotone" stroke="#ff8a4f" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            )}
            {vtx && <ReferenceDot x={vtx.x} y={vtx.y} r={6} fill="#f5c542" stroke="none" />}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {fit && (
        <div className="eq">
          <div><span>2차 회귀식 &nbsp;</span><span className="val">{formatEquation(fit)}</span></div>
          <div><span>R² = </span>{fit.r2.toFixed(4)} &nbsp; <span>(1에 가까울수록 2차 함수에 잘 맞음)</span></div>
          <div>
            <span>a = </span>{fit.a.toExponential(3)} &nbsp;
            <span>b = </span>{fit.b.toFixed(4)} &nbsp;
            <span>c = </span>{fit.c.toFixed(4)}
          </div>
          {vtx && (
            <div>
              <span>꼭짓점 ({vtx.isMax ? "최대" : "최소"}) &nbsp;</span>
              t = {vtx.x.toFixed(2)} s, &nbsp;y = {vtx.y.toFixed(2)}{unit}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
