"use client";

import { useAppStore } from "@/store/app-store";
import { useShallow } from "zustand/shallow";
import { Card } from "@/components/ui/Card";
import { formatKRW } from "@/lib/utils";

export function TomorrowBudgetCard() {
  const tomorrowBudget = useAppStore((s) => s.getTomorrowBudget());
  const todaySummary = useAppStore(useShallow((s) => s.getTodaySummary()));

  if (tomorrowBudget === null) return null;

  const todaySaved = todaySummary ? Math.max(todaySummary.saved, 0) : 0;

  return (
    <Card>
      <p className="text-xs font-semibold" style={{ color: "#888888" }}>
        {todaySaved > 0
          ? `₩${formatKRW(todaySaved)} 아끼면 내일 쓸 수 있는 금액`
          : "내일 쓸 수 있는 금액"}
      </p>
      <div
        className="text-2xl font-bold tabular-nums mt-1 transition-all duration-200"
        style={{ color: "#191919" }}
      >
        ₩{formatKRW(tomorrowBudget)}
      </div>
    </Card>
  );
}
