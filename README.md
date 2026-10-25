# Robot Arm Console

로봇암 서보 모터를 **원격 제어**하고, 기록된 데이터를 **2차 함수(포물선) 회귀 그래프**로 분석하는 대시보드.
Next.js 14 (App Router) · Supabase (Postgres + Realtime) · Vercel.

```
ESP32/Arduino ──POST /api/telemetry──▶ Vercel API ──insert──▶ Supabase servo_logs
      ▲                                                            │ Realtime
      └──GET /api/commands (폴링)◀── commands 테이블 ◀── 대시보드 ◀──┘
```

## 1. Supabase 설정
1. https://supabase.com 에서 새 프로젝트 생성
2. **SQL Editor** → `supabase/schema.sql` 전체 붙여넣기 → Run
3. **Project Settings → API** 에서 `URL`, `anon key`, `service_role key` 복사

## 2. 로컬 실행
```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev                  # http://localhost:3000
```
하드웨어 없이 테스트하려면 다른 터미널에서:
```bash
BASE_URL=http://localhost:3000 ROBOT_API_KEY=<.env의 값> node firmware/simulator.mjs
```
서보 0·1이 포물선 궤적으로 움직이며 대시보드에 2차 회귀 곡선과 R², 꼭짓점이 표시됩니다.

## 3. Vercel 배포
1. GitHub에 push → Vercel에서 Import
2. **Environment Variables** 4개 입력 (`.env.example` 참고)
3. Deploy → `https://<app>.vercel.app`

## 4. 로봇 연결 (ESP32)
`firmware/esp32_robotarm.ino` 에서 `WIFI_SSID / WIFI_PASS / BASE_URL / ROBOT_KEY` 수정 후 업로드.
서보 핀: 13, 12, 14, 27, 26 (0:base 1:shoulder 2:elbow 3:wrist 4:gripper).

## API
| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/telemetry` | `x-robot-key` | 로봇 → 서보 상태 기록 `{readings:[{servo_id,angle,target?,current_ma?,temp_c?}]}` |
| GET | `/api/commands?status=pending` | `x-robot-key` | 로봇 ← 대기 명령 가져오기 (자동으로 `sent` 처리) |
| PATCH | `/api/commands` | `x-robot-key` | 로봇 → `{id,status:"done"|"failed"}` |
| POST | `/api/commands` | 없음* | 대시보드 → `{servo_id,target,speed?}` |
| GET | `/api/servos` / `?id=1&minutes=10` | 없음 | 최신 상태 / 로그 조회 |

\* 외부에 공개할 경우 `POST /api/commands`에 Supabase Auth 또는 비밀번호를 추가하세요.

## 2차 함수 분석
`lib/regression.ts` — 최소제곱법으로 `y = ax² + bx + c` 를 직접 계산 (정규방정식 3×3).
차트에는 측정값(점), 추세선(주황), 꼭짓점(노랑), 회귀식·R²가 함께 표시됩니다.
각도 외에 전류·온도도 같은 방식으로 분석할 수 있습니다.

## 다음 단계 아이디어
- 로그인(Supabase Auth)으로 제어 패널 보호
- 다중 서보 동시 명령(포즈 프리셋)
- 전류 급증 감지 알림 (충돌/과부하)
- CSV 내보내기
