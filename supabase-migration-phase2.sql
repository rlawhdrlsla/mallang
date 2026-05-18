-- Phase 2 마이그레이션: Goal Bag + 참기 잠금
-- Supabase SQL Editor에서 실행하세요

-- 1. wishlist_items에 Goal Bag 컬럼 추가
ALTER TABLE wishlist_items
  ADD COLUMN IF NOT EXISTS current_amount integer not null default 0,
  ADD COLUMN IF NOT EXISTS daily_auto_save integer not null default 0;

-- 2. 참기 잠금 테이블
CREATE TABLE IF NOT EXISTS lock_periods (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null check (reason in ('WEEK1', 'WEEK2', 'MONTH1', 'CUSTOM')),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

ALTER TABLE lock_periods enable row level security;
CREATE POLICY "lock_periods: owner only" ON lock_periods FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS lock_periods_user_active_idx ON lock_periods(user_id, is_active);
