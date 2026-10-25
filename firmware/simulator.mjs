/**
 * 하드웨어 없이 대시보드를 테스트하는 가상 로봇.
 * 포물선 궤적(2차 함수)으로 서보를 움직이며 텔레메트리를 보내고, 명령도 폴링합니다.
 *
 *   BASE_URL=http://localhost:3000 ROBOT_API_KEY=xxx node firmware/simulator.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const KEY = process.env.ROBOT_API_KEY ?? "change-me-to-a-long-random-string";
const H = { "content-type": "application/json", "x-robot-key": KEY };

const N = 5;
const angle = Array(N).fill(90);
const target = Array(N).fill(90);
const t0 = Date.now();

setInterval(async () => {
  const t = (Date.now() - t0) / 1000;
  // 서보 0,1은 포물선 궤적(위로 올라갔다 내려옴), 나머지는 명령 추종
  target[0] = 90 + 60 - 0.6 * (t % 20 - 10) ** 2;        // y = -0.6(t-10)² + 150
  target[1] = 30 + 0.3 * (t % 20) ** 2 / 1.2;             // y = 0.25t² + 30
  for (let i = 0; i < N; i++) {
    const d = target[i] - angle[i];
    angle[i] += Math.abs(d) < 2 ? d : Math.sign(d) * 2;
  }
  const readings = angle.map((a, i) => ({
    servo_id: i, angle: +(a + (Math.random() - 0.5)).toFixed(2), target: +target[i].toFixed(1),
    current_ma: +(80 + Math.abs(target[i] - a) * 15 + Math.random() * 10).toFixed(0),
    temp_c: +(28 + t / 120).toFixed(1),
  }));
  const r = await fetch(`${BASE}/api/telemetry`, { method: "POST", headers: H, body: JSON.stringify({ readings }) });
  console.log("telemetry", r.status, readings.map((x) => x.angle).join(" "));
}, 1000);

setInterval(async () => {
  const r = await fetch(`${BASE}/api/commands?status=pending`, { headers: H });
  if (!r.ok) return;
  const { commands } = await r.json();
  for (const c of commands) {
    target[c.servo_id] = c.target;
    console.log("cmd", c.id, "servo", c.servo_id, "→", c.target);
    await fetch(`${BASE}/api/commands`, { method: "PATCH", headers: H, body: JSON.stringify({ id: c.id, status: "done" }) });
  }
}, 2000);
