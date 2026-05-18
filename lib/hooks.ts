"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import {
  computeDailySummaries,
  getTodaySummary,
  getTomorrowBudget,
  getCycleSummary,
  computeWishlistProgress,
  getActiveLockPeriod,
} from "./budget";
import { today } from "./utils";
import type { DailySummary, LockPeriod, WishlistProgress } from "./types";

export function useDailySummaries(): DailySummary[] {
  const cycle = useAppStore((s) => s.cycle);
  const expenses = useAppStore((s) => s.expenses);
  const profile = useAppStore((s) => s.profile);
  const lockPeriods = useAppStore((s) => s.lockPeriods);
  return useMemo(() => {
    if (!cycle || !profile) return [];
    return computeDailySummaries(cycle, expenses, profile.missing_day_policy, lockPeriods);
  }, [cycle, expenses, profile, lockPeriods]);
}

export function useTodaySummary(): DailySummary | null {
  const summaries = useDailySummaries();
  return useMemo(() => getTodaySummary(summaries), [summaries]);
}

export function useTomorrowBudget(): number | null {
  const summaries = useDailySummaries();
  return useMemo(() => getTomorrowBudget(summaries), [summaries]);
}

export function useCycleSummary() {
  const summaries = useDailySummaries();
  return useMemo(() => getCycleSummary(summaries), [summaries]);
}

export function useRemainingBudget(): { remainingBalance: number; remainingDays: number } {
  const cycle = useAppStore((s) => s.cycle);
  const summaries = useDailySummaries();
  return useMemo(() => {
    if (!cycle) return { remainingBalance: 0, remainingDays: 0 };
    const todayStr = today();
    const idx = summaries.findIndex((s) => s.date === todayStr);
    if (idx === -1) return { remainingBalance: 0, remainingDays: 0 };
    // Use actual balance to avoid floor-rounding accumulation errors
    const effectiveBalance = cycle.total_balance + cycle.carried_over_amount;
    const totalSpent = summaries
      .filter((s) => s.date <= todayStr)
      .reduce((acc, s) => acc + s.spent, 0);
    const remainingBalance = Math.max(0, effectiveBalance - totalSpent);
    const remainingDays = summaries.length - idx;
    return { remainingBalance, remainingDays };
  }, [cycle, summaries]);
}

export function useWishlistProgress(): WishlistProgress[] {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const { totalSaved, elapsedDays } = useCycleSummary();
  return useMemo(() => {
    const dailyAvg = elapsedDays > 0 ? totalSaved / elapsedDays : 0;
    return computeWishlistProgress(wishlistItems, totalSaved, dailyAvg);
  }, [wishlistItems, totalSaved, elapsedDays]);
}

export function useActiveLockPeriod(): LockPeriod | null {
  const lockPeriods = useAppStore((s) => s.lockPeriods);
  return useMemo(() => getActiveLockPeriod(lockPeriods), [lockPeriods]);
}
