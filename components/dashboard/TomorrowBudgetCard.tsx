"use client";

import { useTodaySummary, useTomorrowBudget } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { formatKRW } from "@/lib/utils";

export function TomorrowBudgetCard() {
  const tomorrowBudget = useTomorrowBudget();
  const todaySummary = useTodaySummary();

  if (tomorrowBudget === null) return null;

  const todaySaved = todaySummary ? Math.max(todaySummary.saved, 0) : 0;

  return (
    <Card>
      <p className="text-xs font-semibold" style={{ color: "#888888" }}>
        내일 쓸 수 있는 금액
      </p>
      <div
        className="text-2xl font-bold tabular-nums mt-1 transition-all duration-200"
        style={{ color: "#191919" }}
      >
        ₩{formatKRW(tomorrowBudget)}
      </div>
      {todaySaved > 0 && (
        <p className="text-xs mt-1" style={{ color: "#059669" }}>
          오늘 ₩{formatKRW(todaySaved)} 절약 반영
        </p>
      )}
    </Card>
  );
}
