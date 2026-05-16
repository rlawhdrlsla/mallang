import { Cycle, DailySummary, Expense, MissingDayPolicy, WishlistItem, WishlistProgress } from "./types";
import { dateRange, today, diffDays } from "./utils";

/**
 * 날짜별 일비 계산 (전일 지출 합산 기반 재계산)
 * 각 날의 budget = (잔액 - 고정비 - 이전날까지 지출합) / 남은 일수
 */
export function computeDailySummaries(
  cycle: Cycle,
  expenses: Expense[],
  policy: MissingDayPolicy
): DailySummary[] {
  const allDates = dateRange(cycle.start_date, cycle.next_payday);
  const todayStr = today();

  // 날짜별 실제 지출 map
  const spentByDate = new Map<string, number>();
  for (const e of expenses) {
    spentByDate.set(e.date, (spentByDate.get(e.date) ?? 0) + e.amount);
  }

  const totalDays = allDates.length;
  const effectiveBalance = cycle.total_balance - cycle.fixed_expenses + cycle.carried_over_amount;

  const summaries: DailySummary[] = [];
  let cumulativeSpent = 0;

  for (let i = 0; i < allDates.length; i++) {
    const date = allDates[i];
    const remainingDays = totalDays - i;
    const budget = Math.floor(Math.max(effectiveBalance - cumulativeSpent, 0) / remainingDays);

    let spent = 0;
    if (date <= todayStr) {
      if (spentByDate.has(date)) {
        spent = spentByDate.get(date)!;
      } else if (date < todayStr && date < cycle.last_active_date) {
        // 미입력 날: 정책 적용
        spent = policy === "full" ? budget : 0;
      }
      // 오늘 날짜면 spent=0 (아직 하루 진행 중)
    }

    summaries.push({ date, budget, spent, saved: budget - spent });
    cumulativeSpent += spent;
  }

  return summaries;
}

export function getTodaySummary(summaries: DailySummary[]): DailySummary | null {
  const todayStr = today();
  return summaries.find((s) => s.date === todayStr) ?? null;
}

export function getTomorrowBudget(summaries: DailySummary[]): number | null {
  const todayStr = today();
  const idx = summaries.findIndex((s) => s.date === todayStr);
  if (idx === -1 || idx + 1 >= summaries.length) return null;
  const todaySummary = summaries[idx];
  // 내일 예산 = (남은 잔액) / (남은 일수 - 1)
  // 남은 잔액 = budget * 남은일수 - 오늘지출
  const remainingDays = summaries.length - idx;
  const remainingBalance = todaySummary.budget * remainingDays - todaySummary.spent;
  if (remainingDays - 1 <= 0) return null;
  return Math.floor(Math.max(remainingBalance, 0) / (remainingDays - 1));
}

export function getCycleSummary(summaries: DailySummary[]) {
  const todayStr = today();
  const pastDays = summaries.filter((s) => s.date <= todayStr);
  const totalSpent = pastDays.reduce((acc, s) => acc + s.spent, 0);
  const totalSaved = pastDays.reduce((acc, s) => acc + Math.max(s.saved, 0), 0);
  const savedDays = pastDays.filter((s) => s.saved > 0).length;
  const elapsedDays = pastDays.length;
  return { totalSpent, totalSaved, savedDays, elapsedDays, totalDays: summaries.length };
}

export function getDailyAvgSaving(totalSaved: number, elapsedDays: number): number {
  if (elapsedDays === 0) return 0;
  return totalSaved / elapsedDays;
}

export function computeWishlistProgress(
  items: WishlistItem[],
  totalSaved: number,
  dailyAvgSaving: number
): WishlistProgress[] {
  return items
    .map((item) => {
      const remaining = Math.max(0, item.price - totalSaved);
      const alreadyAchievable = remaining === 0;
      const daysNeeded = alreadyAchievable || dailyAvgSaving <= 0
        ? 0
        : Math.ceil(remaining / dailyAvgSaving);
      return { item, daysNeeded, alreadyAchievable };
    })
    .sort((a, b) => {
      if (a.alreadyAchievable && !b.alreadyAchievable) return -1;
      if (!a.alreadyAchievable && b.alreadyAchievable) return 1;
      return a.daysNeeded - b.daysNeeded;
    });
}

export function getMissingDates(lastActiveDate: string): string[] {
  const last = lastActiveDate;
  const todayStr = today();
  if (last >= todayStr) return [];
  const dates = dateRange(last, todayStr);
  // last_active_date 당일과 오늘은 제외, 사이 날짜만
  return dates.slice(1, -1);
}

export function isPaydayReached(nextPayday: string): boolean {
  return today() >= nextPayday;
}

export function getPreviousCycleSavings(summaries: DailySummary[]): number {
  return summaries.reduce((acc, s) => acc + Math.max(s.saved, 0), 0);
}

export function remainingDaysInCycle(nextPayday: string): number {
  return Math.max(0, diffDays(today(), nextPayday));
}
