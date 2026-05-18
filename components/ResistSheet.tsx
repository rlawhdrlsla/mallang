"use client";

import { BottomSheet } from "./ui/BottomSheet";
import { useTodaySummary, useWishlistProgress, useRemainingBudget } from "@/lib/hooks";
import { formatMarshmallow } from "@/lib/utils";

interface ResistSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ResistSheet({ open, onClose }: ResistSheetProps) {
  const todaySummary = useTodaySummary();
  const progressList = useWishlistProgress();
  const { remainingBalance } = useRemainingBudget();

  const nearestGoal = progressList.find((p) => !p.alreadyAchievable && p.daysNeeded > 0);
  const todayRemaining = todaySummary ? Math.max(0, todaySummary.budget - todaySummary.spent) : 0;
  const progressPct = todaySummary && todaySummary.budget > 0
    ? Math.min((todayRemaining / todaySummary.budget) * 100, 100)
    : 100;

  return (
    <BottomSheet open={open} onClose={onClose} title="">
      <div style={{
        background: "linear-gradient(160deg, #FCE8F0 0%, #FFF5F8 60%, #FFFFFF 100%)",
        margin: "-20px -1px 0",
        borderRadius: "24px 24px 0 0",
        padding: "28px 24px 36px",
      }}>
        <p style={{ fontSize: 28, fontWeight: 900, color: "#1C1A1A", lineHeight: 1.2, marginBottom: 6 }}>
          지금 참으면<br />이만큼 쌓여요!
        </p>
        <p style={{ fontSize: 14, color: "#888888", marginBottom: 28 }}>
          봉지 종료일까지 아직 이만큼 남아있어요
        </p>

        {/* 봉지 종료일까지 쌓일 금액 */}
        <div style={{
          background: "rgba(255,255,255,0.8)",
          borderRadius: 20,
          padding: "20px 24px",
          marginBottom: 20,
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(224,96,144,0.12)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ color: "#E06090", fontSize: 12, fontWeight: 800, letterSpacing: "1px" }}>봉지 종료일까지 쌓이는 마쉬멜로</span>
            <span style={{ fontSize: 14 }}>⭐</span>
          </div>
          <p style={{ fontSize: 44, fontWeight: 900, color: "#E06090", lineHeight: 1, letterSpacing: "-1px" }}>
            {remainingBalance.toLocaleString("ko-KR")}
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#E06090", marginBottom: 12 }}>개</p>

          {/* 오늘 잔여 프로그레스 */}
          <div style={{ height: 6, borderRadius: 99, background: "#FCE8F0", marginBottom: 8 }}>
            <div style={{
              height: 6, borderRadius: 99, width: `${progressPct}%`,
              background: "linear-gradient(90deg, #E06090, #F0A0BB)",
              transition: "width 400ms ease",
            }} />
          </div>
          <p style={{ fontSize: 12, color: "#BBBBBB" }}>
            오늘 남은 마쉬멜로 {formatMarshmallow(todayRemaining)}
          </p>

          {nearestGoal && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #FCE8F0" }}>
              <p style={{ fontSize: 13, color: "#888888", lineHeight: 1.5 }}>
                <strong style={{ color: "#1C1A1A" }}>{nearestGoal.item.name}</strong>를{" "}
                <strong style={{ color: "#E06090" }}>1일 더 빨리</strong> 만날 수 있어요! 🎮
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", height: 58, borderRadius: 999,
            background: "#1C1A1A", color: "#FFFFFF",
            fontWeight: 800, fontSize: 17, border: "none",
            marginBottom: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          ✦ 지금 바로 참을게요!
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", background: "transparent", border: "none",
            color: "#BBBBBB", fontSize: 14, fontWeight: 500,
            padding: "8px 0",
          }}
        >
          조금만 먹을래요...
        </button>
      </div>
    </BottomSheet>
  );
}
