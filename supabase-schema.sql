-- Supabase에서 SQL Editor에 붙여넣기 후 실행하세요

-- 1. 프로필
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  gender text not null check (gender in ('male', 'female')),
  missing_day_policy text not null default 'full' check (missing_day_policy in ('zero', 'full')),
  created_at timestamptz default now()
);

-- 2. 예산 사이클
create table cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  total_balance integer not null,
  fixed_expenses integer not null default 0,
  start_date date not null,
  next_payday date not null,
  carried_over_amount integer not null default 0,
  last_active_date date not null,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- 3. 지출 내역
create table expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  amount integer not null,
  category text not null check (category in ('food', 'transport', 'shopping', 'etc')),
  note text not null default '',
  created_at timestamptz default now()
);

-- 4. 위시리스트
create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  price integer not null,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) 활성화
alter table profiles enable row level security;
alter table cycles enable row level security;
alter table expenses enable row level security;
alter table wishlist_items enable row level security;

-- RLS 정책: 자기 데이터만 접근
create policy "profiles: self only" on profiles for all using (auth.uid() = id);
create policy "cycles: owner only" on cycles for all using (auth.uid() = user_id);
create policy "expenses: owner only" on expenses for all using (auth.uid() = user_id);
create policy "wishlist: owner only" on wishlist_items for all using (auth.uid() = user_id);

-- 인덱스
create index on expenses(user_id, date);
create index on expenses(cycle_id);
create index on cycles(user_id, ended_at);
