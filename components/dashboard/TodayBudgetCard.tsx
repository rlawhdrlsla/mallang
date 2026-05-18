"use client";

import { useTodaySummary, useTomorrowBudget } from "@/lib/hooks";
import { formatMarshmallow } from "@/lib/utils";

// 예산을 N개의 이모지로 표현하기 위한 단위 계산
function calcUnit(budget: number): number {
  if (budget <= 0) return 1000;
  const steps = [100, 200, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 100000, 200000, 500000];
  for (const step of steps) {
    const count = Math.floor(budget / step);
    if (count >= 5 && count <= 9) return step;
  }
  return Math.max(1, Math.ceil(budget / 7));
}

export function TodayBudgetCard() {
  const todaySummary = useTodaySummary();
  const tomorrowBudget = useTomorrowBudget();

  if (!todaySummary) return null;

  const { budget, spent, saved } = todaySummary;
  const isOver = saved < 0;
  const remaining = Math.max(0, budget - spent);

  const unit = calcUnit(budget);
  const totalIcons = Math.min(Math.floor(budget / unit), 9);
  const eatenIcons = Math.min(Math.ceil(spent / unit), totalIcons);
  const remainingIcons = totalIcons - eatenIcons;

  const tomorrowUnit = unit;
  const tomorrowIcons = tomorrowBudget !== null ? Math.min(Math.floor(tomorrowBudget / tomorrowUnit), 12) : null;
  const bonus = tomorrowIcons !== null ? tomorrowIcons - totalIcons : 0;

  return (
    <div style={{ borderRadius: 24, overflow: "hidden" }}>
      {/* 상단: 오늘 마쉬멜로 */}
      <div style={{ background: "#111111", padding: "22px 22px 20px" }}>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
          오늘 마쉬멜로
        </p>

        {/* 이모지 그리드 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18, minHeight: 44 }}>
          {Array.from({ length: remainingIcons }).map((_, i) => (
            <span key={`r-${i}`} style={{ fontSize: 34, lineHeight: 1 }}>🍥</span>
          ))}
          {Array.from({ length: eatenIcons }).map((_, i) => (
            <span key={`e-${i}`} style={{ fontSize: 34, lineHeight: 1, opacity: 0.15, filter: "grayscale(1)" }}>🍥</span>
          ))}
        </div>

        {/* 먹음 / 남음 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>먹음</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: spent > 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)" }}>
              {formatMarshmallow(spent)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>
              {isOver ? "초과" : "남음"}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: isOver ? "#F87171" : "#6EE7B7" }}>
              {isOver ? `-${formatMarshmallow(Math.abs(saved))}` : formatMarshmallow(remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* 하단: 내일 미리보기 */}
      {tomorrowIcons !== null && (
        <div style={{
          background: "#F8F7F4",
          padding: "14px 22px 16px",
          borderTop: "1px solid #E8E6DF",
        }}>
          <p style={{ fontSize: 11, color: "#AAAAAA", fontWeight: 600, marginBottom: 10 }}>
            오늘 다 참으면 내일은 →
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            {/* 오늘과 같은 수량 */}
            {Array.from({ length: Math.min(totalIcons, tomorrowIcons) }).map((_, i) => (
              <span key={`t-${i}`} style={{ fontSize: 22, lineHeight: 1, opacity: 0.55 }}>🍥</span>
            ))}
            {/* 보너스 */}
            {bonus > 0 && Array.from({ length: bonus }).map((_, i) => (
              <span key={`b-${i}`} style={{ fontSize: 22, lineHeight: 1 }}>🍥</span>
            ))}
            {bonus > 0 && (
              <span style={{
                marginLeft: 6,
                fontSize: 13,
                fontWeight: 800,
                color: "#059669",
                background: "#D1FAE5",
                borderRadius: 99,
                padding: "2px 8px",
              }}>
                +{bonus}개!
              </span>
            )}
            {bonus === 0 && tomorrowBudget !== null && (
              <span style={{ fontSize: 12, color: "#AAAAAA", marginLeft: 4 }}>
                {formatMarshmallow(tomorrowBudget)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
