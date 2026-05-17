"use client";

import { useTodaySummary, useRemainingBudget } from "@/lib/hooks";
import { formatKRW } from "@/lib/utils";

export function TodayBudgetCard() {
  const todaySummary = useTodaySummary();
  const { remainingBalance, remainingDays } = useRemainingBudget();

  if (!todaySummary) return null;

  const { budget, spent, saved } = todaySummary;
  const isOver = saved < 0;
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 1;
  const pct = ratio * 100;

  return (
    <div
      style={{
        background: "#111111",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        오늘 쓸 수 있는 금액
      </p>
      <div
        className="tabular-nums transition-all duration-200"
        style={{ color: "#FFFFFF", fontSize: 40, fontWeight: 800, marginBottom: 16, lineHeight: 1.1 }}
      >
        ₩{formatKRW(budget)}
      </div>

      {/* Inline progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            height: 6,
            borderRadius: 999,
            width: `${pct}%`,
            background: isOver ? "#DC2626" : "#FFFFFF",
            transition: "width 200ms",
          }}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>지출</p>
          <p className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
            ₩{formatKRW(spent)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>
            {isOver ? "초과" : "남은 금액"}
          </p>
          <p
            className="tabular-nums"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: isOver ? "#F87171" : "#34D399",
            }}
          >
            {isOver ? `-₩${formatKRW(Math.abs(saved))}` : `₩${formatKRW(saved)}`}
          </p>
        </div>
      </div>

      {remainingDays > 1 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            월급날까지 {remainingDays}일간 총 사용 가능
          </span>
          <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            ₩{formatKRW(remainingBalance)}
          </span>
        </div>
      )}
    </div>
  );
}
