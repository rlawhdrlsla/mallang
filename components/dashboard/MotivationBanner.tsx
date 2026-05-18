"use client";

import { useMemo } from "react";
import { useTodaySummary, useRemainingBudget } from "@/lib/hooks";
import { useAppStore } from "@/store/app-store";
import { diffDays, today } from "@/lib/utils";
import { getMotivationMessage } from "@/lib/motivation";

export function MotivationBanner() {
  const todaySummary = useTodaySummary();
  const { remainingBalance, remainingDays } = useRemainingBudget();
  const cycle = useAppStore((s) => s.cycle);

  const message = useMemo(() => {
    if (!todaySummary || !cycle) return "오늘도 말랑이와 함께해요 🍥";
    return getMotivationMessage({
      todaySpent: todaySummary.spent,
      todayBudget: todaySummary.budget,
      remainingBalance,
      remainingDays,
      daysToPayday: Math.max(0, diffDays(today(), cycle.next_payday)),
      hour: new Date().getHours(),
    });
  }, [todaySummary, remainingBalance, remainingDays, cycle]);

  return (
    <div className="px-5 pt-2 pb-1">
      <p className="text-sm font-semibold" style={{ color: "#6B6B6B" }}>
        {message}
      </p>
    </div>
  );
}
