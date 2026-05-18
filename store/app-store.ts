"use client";

import { create } from "zustand";
import { Profile, Cycle, Expense, WishlistItem, LockPeriod, DailySummary } from "@/lib/types";
import { computeDailySummaries, getCycleSummary, getTodaySummary, getTomorrowBudget, computeWishlistProgress } from "@/lib/budget";
import { WishlistProgress } from "@/lib/types";

interface AppState {
  profile: Profile | null;
  cycle: Cycle | null;
  expenses: Expense[];
  wishlistItems: WishlistItem[];
  lockPeriods: LockPeriod[];
  isLoading: boolean;

  setProfile: (p: Profile | null) => void;
  setCycle: (c: Cycle | null) => void;
  setExpenses: (e: Expense[]) => void;
  setWishlistItems: (w: WishlistItem[]) => void;
  setLockPeriods: (l: LockPeriod[]) => void;
  addExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;
  addWishlistItem: (w: WishlistItem) => void;
  updateWishlistItem: (w: WishlistItem) => void;
  removeWishlistItem: (id: string) => void;
  addLockPeriod: (l: LockPeriod) => void;
  deactivateLockPeriod: (id: string) => void;
  setLoading: (v: boolean) => void;

  getDailySummaries: () => DailySummary[];
  getTodaySummary: () => DailySummary | null;
  getTomorrowBudget: () => number | null;
  getCycleSummary: () => ReturnType<typeof getCycleSummary>;
  getWishlistProgress: () => WishlistProgress[];
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  cycle: null,
  expenses: [],
  wishlistItems: [],
  lockPeriods: [],
  isLoading: true,

  setProfile: (p) => set({ profile: p }),
  setCycle: (c) => set({ cycle: c }),
  setExpenses: (e) => set({ expenses: e }),
  setWishlistItems: (w) => set({ wishlistItems: w }),
  setLockPeriods: (l) => set({ lockPeriods: l }),
  addExpense: (e) => set((s) => ({ expenses: [...s.expenses, e] })),
  removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
  addWishlistItem: (w) => set((s) => ({ wishlistItems: [...s.wishlistItems, w] })),
  updateWishlistItem: (w) => set((s) => ({ wishlistItems: s.wishlistItems.map((i) => i.id === w.id ? w : i) })),
  removeWishlistItem: (id) => set((s) => ({ wishlistItems: s.wishlistItems.filter((w) => w.id !== id) })),
  addLockPeriod: (l) => set((s) => ({ lockPeriods: [...s.lockPeriods, l] })),
  deactivateLockPeriod: (id) => set((s) => ({
    lockPeriods: s.lockPeriods.map((l) => l.id === id ? { ...l, is_active: false } : l),
  })),
  setLoading: (v) => set({ isLoading: v }),

  getDailySummaries: () => {
    const { cycle, expenses, profile, lockPeriods } = get();
    if (!cycle || !profile) return [];
    return computeDailySummaries(cycle, expenses, profile.missing_day_policy, lockPeriods);
  },

  getTodaySummary: () => {
    const summaries = get().getDailySummaries();
    return getTodaySummary(summaries);
  },

  getTomorrowBudget: () => {
    const summaries = get().getDailySummaries();
    return getTomorrowBudget(summaries);
  },

  getCycleSummary: () => {
    const summaries = get().getDailySummaries();
    return getCycleSummary(summaries);
  },

  getWishlistProgress: () => {
    const { wishlistItems } = get();
    const { totalSaved, elapsedDays } = get().getCycleSummary();
    const dailyAvg = elapsedDays > 0 ? totalSaved / elapsedDays : 0;
    return computeWishlistProgress(wishlistItems, totalSaved, dailyAvg);
  },
}));
