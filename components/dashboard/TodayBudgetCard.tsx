"use client";

import { useTodaySummary, useRemainingBudget } from "@/lib/hooks";
import { formatMarshmallow } from "@/lib/utils";

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
        borderRadius: 20,
        padding: 22,
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        오늘 먹을 수 있는 마쉬멜로
      </p>

      <div style={{ marginBottom: 18 }}>
        <span
          className="transition-all duration-200"
          style={{ color: "#FFFFFF", fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}
        >
          {formatMarshmallow(budget)}
        </span>
      </div>

      {/* 진행 바 */}
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
            background: isOver ? "#F87171" : "rgba(255,255,255,0.8)",
            transition: "width 300ms ease",
          }}
        />
      </div>

      {/* 먹음 / 남음 */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>먹음</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            {formatMarshmallow(spent)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>
            {isOver ? "초과" : "남음"}
          </p>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: isOver ? "#F87171" : "#6EE7B7",
            }}
          >
            {isOver ? `-${formatMarshmallow(Math.abs(saved))}` : formatMarshmallow(Math.max(saved, 0))}
          </p>
        </div>
      </div>

      {/* 봉지 잔량 */}
      {remainingDays > 1 && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            마쉬멜로 받는 날까지 {remainingDays}일
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
            봉지에 {formatMarshmallow(remainingBalance)}
          </span>
        </div>
      )}
    </div>
  );
}
