export type Gender = "male" | "female";
export type Category = "food" | "transport" | "shopping" | "etc";
export type MissingDayPolicy = "zero" | "full";
export type LockReason = "WEEK1" | "WEEK2" | "MONTH1" | "CUSTOM";

export interface Profile {
  id: string;
  nickname: string;
  gender: Gender;
  missing_day_policy: MissingDayPolicy;
  created_at: string;
}

export interface Cycle {
  id: string;
  user_id: string;
  total_balance: number;
  fixed_expenses: number;
  start_date: string;
  next_payday: string;
  carried_over_amount: number;
  last_active_date: string;
  ended_at: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  cycle_id: string;
  user_id: string;
  date: string;
  amount: number;
  category: Category;
  note: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  price: number;
  image_url?: string | null;
  current_amount: number;
  daily_auto_save: number;
  created_at: string;
}

export interface LockPeriod {
  id: string;
  cycle_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: LockReason;
  is_active: boolean;
  created_at: string;
}

export interface DailySummary {
  date: string;
  budget: number;
  spent: number;
  saved: number;
  locked: boolean;
}

export interface WishlistProgress {
  item: WishlistItem;
  daysNeeded: number;
  alreadyAchievable: boolean;
}
