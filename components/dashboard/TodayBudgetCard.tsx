"use client";

import { useTodaySummary, useTomorrowBudget, useRemainingBudget } from "@/lib/hooks";
import { formatMarshmallow } from "@/lib/utils";

function calcUnit(budget: number): number {
  if (budget <= 0) return 1000;
  const steps = [100, 200, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 100000, 200000, 500000];
  for (const step of steps) {
    const count = Math.floor(budget / step);
    if (count >= 5 && count <= 10) return step;
  }
  return Math.max(1, Math.ceil(budget / 7));
}

export function TodayBudgetCard() {
  const todaySummary = useTodaySummary();
  const tomorrowBudget = useTomorrowBudget();
  const { remainingDays } = useRemainingBudget();

  if (!todaySummary) return null;

  const { budget, spent, saved } = todaySummary;
  const isOver = saved < 0;

  const unit = calcUnit(budget);
  const totalIcons = Math.max(1, Math.min(Math.floor(budget / unit), 10));
  const spentIcons = Math.min(Math.ceil(spent / unit), totalIcons);
  const remainingIcons = totalIcons - spentIcons;

  // 내일 미리보기 (같은 단위 기준)
  const tomorrowIcons = tomorrowBudget !== null ? Math.floor(tomorrowBudget / unit) : null;
  const bonusIcons = tomorrowIcons !== null ? Math.max(0, tomorrowIcons - totalIcons) : 0;

  return (
    <div style={{ background: "#111111", borderRadius: 20, padding: 22 }}>
      {/* 오늘 마시멜로 이모지 그리드 */}
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
        오늘 마쉬멜로 {totalIcons}개 (1개 = {formatMarshmallow(unit)})
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18, minHeight: 40 }}>
        {Array.from({ length: remainingIcons }).map((_, i) => (
          <span key={`r-${i}`} style={{ fontSize: 30, lineHeight: 1 }}>🍥</span>
        ))}
        {Array.from({ length: spentIcons }).map((_, i) => (
          <span key={`s-${i}`} style={{ fontSize: 30, lineHeight: 1, opacity: 0.18, filter: "grayscale(1)" }}>🍥</span>
        ))}
      </div>

      {/* 먹음 / 남음 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>먹음</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>
            {formatMarshmallow(spent)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>
            {isOver ? "초과" : "남음"}
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, color: isOver ? "#F87171" : "#6EE7B7" }}>
            {isOver
              ? `-${formatMarshmallow(Math.abs(saved))}`
              : formatMarshmallow(Math.max(saved, 0))}
          </p>
        </div>
      </div>

      {/* 내일 미리보기: "오늘 다 참으면 내일은 이만큼" */}
      {tomorrowIcons !== null && remainingDays > 1 && (
        <div style={{
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
            오늘 다 참으면 내일은 →
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
            {/* 오늘과 같은 수량 */}
            {Array.from({ length: Math.min(totalIcons, tomorrowIcons) }).map((_, i) => (
              <span key={`t-${i}`} style={{ fontSize: 20, lineHeight: 1, opacity: 0.7 }}>🍥</span>
            ))}
            {/* 오늘보다 늘어난 보너스 */}
            {Array.from({ length: bonusIcons }).map((_, i) => (
              <span key={`b-${i}`} style={{ fontSize: 20, lineHeight: 1 }}>🍥</span>
            ))}
            {bonusIcons > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6EE7B7",
                marginLeft: 4,
              }}>
                +{bonusIcons}개!
              </span>
            )}
          </div>
          {tomorrowBudget !== null && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
              내일 예산 {formatMarshmallow(tomorrowBudget)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
