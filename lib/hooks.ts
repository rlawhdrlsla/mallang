"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import {
  computeDailySummaries,
  getTodaySummary,
  getTomorrowBudget,
  getCycleSummary,
  computeWishlistProgress,
} from "./budget";
import { today } from "./utils";
import type { DailySummary, WishlistProgress } from "./types";

export function useDailySummaries(): DailySummary[] {
  const cycle = useAppStore((s) => s.cycle);
  const expenses = useAppStore((s) => s.expenses);
  const profile = useAppStore((s) => s.profile);
  return useMemo(() => {
    if (!cycle || !profile) return [];
    return computeDailySummaries(cycle, expenses, profile.missing_day_policy);
  }, [cycle, expenses, profile]);
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
  const summaries = useDailySummaries();
  return useMemo(() => {
    const todayStr = today();
    const idx = summaries.findIndex((s) => s.date === todayStr);
    if (idx === -1) return { remainingBalance: 0, remainingDays: 0 };
    const s = summaries[idx];
    const remainingDays = summaries.length - idx;
    const remainingBalance = Math.max(0, s.budget * remainingDays - s.spent);
    return { remainingBalance, remainingDays };
  }, [summaries]);
}

export function useWishlistProgress(): WishlistProgress[] {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const { totalSaved, elapsedDays } = useCycleSummary();
  return useMemo(() => {
    const dailyAvg = elapsedDays > 0 ? totalSaved / elapsedDays : 0;
    return computeWishlistProgress(wishlistItems, totalSaved, dailyAvg);
  }, [wishlistItems, totalSaved, elapsedDays]);
}
