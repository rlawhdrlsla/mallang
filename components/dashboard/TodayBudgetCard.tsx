"use client";

import { useTodaySummary, useRemainingBudget } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatKRW } from "@/lib/utils";

export function TodayBudgetCard() {
  const todaySummary = useTodaySummary();
  const { remainingBalance, remainingDays } = useRemainingBudget();

  if (!todaySummary) return null;

  const { budget, spent, saved } = todaySummary;
  const isOver = saved < 0;
  const ratio = budget > 0 ? spent / budget : 1;

  return (
    <Card>
      <p className="text-sm font-semibold" style={{ color: "#888888" }}>
        오늘 쓸 수 있는 금액
      </p>
      <div
        className="text-[40px] font-extrabold tabular-nums mt-1 mb-4 transition-all duration-200"
        style={{ color: "#191919" }}
      >
        ₩{formatKRW(budget)}
      </div>

      <ProgressBar value={ratio} danger={isOver} />

      <div className="flex justify-between mt-3">
        <div>
          <p className="text-xs" style={{ color: "#888888" }}>지출</p>
          <p className="text-base font-bold tabular-nums" style={{ color: "#191919" }}>
            ₩{formatKRW(spent)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "#888888" }}>
            {isOver ? "초과" : "남은 금액"}
          </p>
          <p
            className="text-base font-bold tabular-nums"
            style={{ color: isOver ? "#FF3B30" : "#00B493" }}
          >
            {isOver ? `-₩${formatKRW(Math.abs(saved))}` : `₩${formatKRW(saved)}`}
          </p>
        </div>
      </div>

      {remainingDays > 1 && (
        <div
          className="mt-3 pt-3 flex items-center justify-between border-t"
          style={{ borderColor: "#F0F0F0" }}
        >
          <span className="text-xs" style={{ color: "#888888" }}>
            월급날까지 {remainingDays}일간 총 사용 가능
          </span>
          <span className="text-xs font-bold tabular-nums" style={{ color: "#191919" }}>
            ₩{formatKRW(remainingBalance)}
          </span>
        </div>
      )}
    </Card>
  );
}
