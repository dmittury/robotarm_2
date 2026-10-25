-- Supabase SQL Editor에 그대로 붙여넣고 실행하세요.

-- 1) 서보 모터 정의 (관절 이름, 범위)
create table if not exists servos (
  id          int primary key,            -- 0,1,2,... (펌웨어의 서보 인덱스와 동일)
  name        text not null,              -- base, shoulder, elbow, wrist, gripper
  min_angle   real not null default 0,
  max_angle   real not null default 180,
  created_at  timestamptz default now()
);

insert into servos (id, name) values
  (0, 'base'), (1, 'shoulder'), (2, 'elbow'), (3, 'wrist'), (4, 'gripper')
on conflict (id) do nothing;

-- 2) 텔레메트리 로그 (로봇이 주기적으로 보고)
create table if not exists servo_logs (
  id          bigserial primary key,
  servo_id    int not null references servos(id),
  angle       real not null,              -- 현재 각도(deg)
  target      real,                       -- 목표 각도
  current_ma  real,                       -- 전류(mA), 선택
  temp_c      real,                       -- 온도, 선택
  recorded_at timestamptz not null default now()
);
create index if not exists servo_logs_servo_time on servo_logs (servo_id, recorded_at desc);

-- 3) 원격 명령 큐 (대시보드 -> 로봇)
create table if not exists commands (
  id          bigserial primary key,
  servo_id    int not null references servos(id),
  target      real not null,
  speed       real default 1.0,           -- 0~1, 펌웨어에서 해석
  status      text not null default 'pending'  -- pending | sent | done | failed
    check (status in ('pending','sent','done','failed')),
  created_at  timestamptz default now(),
  acked_at    timestamptz
);
create index if not exists commands_status on commands (status, created_at);

-- 4) 서보별 최신 상태 뷰
create or replace view servo_latest as
select distinct on (l.servo_id)
  l.servo_id, s.name, l.angle, l.target, l.current_ma, l.temp_c, l.recorded_at
from servo_logs l
join servos s on s.id = l.servo_id
order by l.servo_id, l.recorded_at desc;

-- 5) Realtime 활성화 (대시보드가 live 구독)
alter publication supabase_realtime add table servo_logs;
alter publication supabase_realtime add table commands;

-- 6) RLS: 브라우저(anon)는 읽기만, 쓰기는 서버(service role)만
alter table servos      enable row level security;
alter table servo_logs  enable row level security;
alter table commands    enable row level security;

create policy "anon read servos"     on servos     for select to anon using (true);
create policy "anon read servo_logs" on servo_logs for select to anon using (true);
create policy "anon read commands"   on commands   for select to anon using (true);
