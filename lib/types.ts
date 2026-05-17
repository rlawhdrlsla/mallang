export type Gender = "male" | "female";
export type Category = "food" | "transport" | "shopping" | "etc";
export type MissingDayPolicy = "zero" | "full"; // zero=지출없음, full=예산소진

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
  start_date: string;      // YYYY-MM-DD
  next_payday: string;     // YYYY-MM-DD
  carried_over_amount: number; // 이전 사이클 이월 절약액
  last_active_date: string;
  ended_at: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  cycle_id: string;
  user_id: string;
  date: string;            // YYYY-MM-DD
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
  created_at: string;
}

// 계산된 일별 요약 (DB 저장 안 함, computed)
export interface DailySummary {
  date: string;
  budget: number;
  spent: number;
  saved: number;   // 음수 = 초과
}

// 동기부여 카드용 계산 결과
export interface WishlistProgress {
  item: WishlistItem;
  daysNeeded: number;    // 0 이하 = 이미 달성 가능
  alreadyAchievable: boolean;
}
