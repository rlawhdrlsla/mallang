import { Cycle, DailySummary, Expense, LockPeriod, MissingDayPolicy, WishlistItem, WishlistProgress } from "./types";
import { dateRange, today, diffDays } from "./utils";

function isDateLocked(date: string, lockPeriods: LockPeriod[]): boolean {
  return lockPeriods.some(
    (lp) => lp.is_active && date >= lp.start_date && date <= lp.end_date
  );
}

export function computeDailySummaries(
  cycle: Cycle,
  expenses: Expense[],
  policy: MissingDayPolicy,
  lockPeriods: LockPeriod[] = []
): DailySummary[] {
  const allDates = dateRange(cycle.start_date, cycle.next_payday);
  const todayStr = today();

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
    const locked = isDateLocked(date, lockPeriods);

    // 잠금 중인 날: budget=0, spent=0
    if (locked) {
      summaries.push({ date, budget: 0, spent: 0, saved: 0, locked: true });
      continue;
    }

    const remainingDays = totalDays - i - lockPeriods.filter(
      (lp) => lp.is_active && lp.start_date > date && lp.end_date <= allDates[allDates.length - 1]
    ).reduce((acc, lp) => {
      const start = new Date(lp.start_date + "T00:00:00");
      const end = new Date(lp.end_date + "T00:00:00");
      return acc + Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    }, 0);

    const budget = Math.floor(Math.max(effectiveBalance - cumulativeSpent, 0) / Math.max(remainingDays, 1));

    let spent = 0;
    if (date <= todayStr) {
      if (spentByDate.has(date)) {
        spent = spentByDate.get(date)!;
      } else if (date < todayStr && date < cycle.last_active_date) {
        spent = policy === "full" ? budget : 0;
      }
    }

    summaries.push({ date, budget, spent, saved: budget - spent, locked: false });
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
  const savedDays = pastDays.filter((s) => s.saved > 0 && !s.locked).length;
  const elapsedDays = pastDays.filter((s) => !s.locked).length;
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
      const remaining = Math.max(0, item.price - item.current_amount);
      const alreadyAchievable = remaining === 0 || item.current_amount >= item.price;
      const effectiveDailyRate = item.daily_auto_save > 0 ? item.daily_auto_save : dailyAvgSaving;
      const daysNeeded = alreadyAchievable || effectiveDailyRate <= 0
        ? 0
        : Math.ceil(remaining / effectiveDailyRate);
      return { item, daysNeeded, alreadyAchievable };
    })
    .sort((a, b) => {
      if (a.alreadyAchievable && !b.alreadyAchievable) return -1;
      if (!a.alreadyAchievable && b.alreadyAchievable) return 1;
      return a.daysNeeded - b.daysNeeded;
    });
}

export function getMissingDates(lastActiveDate: string): string[] {
  const todayStr = today();
  if (lastActiveDate >= todayStr) return [];
  const dates = dateRange(lastActiveDate, todayStr);
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

export function getActiveLockPeriod(lockPeriods: LockPeriod[]): LockPeriod | null {
  const todayStr = today();
  return lockPeriods.find(
    (lp) => lp.is_active && todayStr >= lp.start_date && todayStr <= lp.end_date
  ) ?? null;
}
