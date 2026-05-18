"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useTodaySummary, useRemainingBudget, useCycleSummary, useWishlistProgress } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { ExpenseInputSheet } from "@/components/ExpenseInputSheet";
import { ResistSheet } from "@/components/ResistSheet";
import { formatMarshmallow, formatDate, today, diffDays } from "@/lib/utils";
import { PaydayAlert } from "@/components/PaydayAlert";
import { QuickResistBar } from "@/components/dashboard/QuickResistBar";

function Dashboard() {
  const [eatOpen, setEatOpen] = useState(false);
  const [resistOpen, setResistOpen] = useState(false);

  const profile = useAppStore((s) => s.profile);
  const cycle = useAppStore((s) => s.cycle);
  const isLoading = useAppStore((s) => s.isLoading);
  const expenses = useAppStore((s) => s.expenses);
  const todaySummary = useTodaySummary();
  const { remainingBalance, remainingDays } = useRemainingBudget();
  const { totalSaved } = useCycleSummary();
  const progressList = useWishlistProgress();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1C1A1A" }}>
        <div className="text-sm" style={{ color: "#555555" }}>불러오는 중...</div>
      </div>
    );
  }

  const budget = todaySummary?.budget ?? 0;
  const spent = todaySummary?.spent ?? 0;
  const remaining = Math.max(0, budget - spent);
  const isOver = (todaySummary?.saved ?? 0) < 0;
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const daysLeft = cycle ? diffDays(today(), cycle.next_payday) : 0;

  const todayExpenses = expenses.filter((e) => e.date === today());

  return (
    <div className="page-fade" style={{ background: "#1C1A1A", minHeight: "100vh", paddingBottom: 120 }}>
      {/* 헤더 */}
      <div style={{ padding: "52px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#2E2C2C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🍥
          </div>
          <span style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" }}>Mallang</span>
        </div>
        {totalSaved > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#2A2828", borderRadius: 99, padding: "6px 12px" }}>
            <span style={{ fontSize: 13 }}>🔥</span>
            <span style={{ color: "#F0A0BB", fontSize: 12, fontWeight: 700 }}>{formatMarshmallow(totalSaved)}</span>
          </div>
        )}
      </div>

      <PaydayAlert />

      {/* 동기부여 메시지 카드 */}
      <MotivationCard spent={spent} budget={budget} remainingDays={remainingDays} />

      {/* 마쉬멜로 캐릭터 + 오늘 현황 */}
      <div style={{ margin: "12px 20px 0" }}>
        {/* 캐릭터 영역 */}
        <div style={{
          background: "#252323",
          borderRadius: 24,
          padding: "20px 0 16px",
          textAlign: "center",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 8 }}>🍥</div>
          <p style={{ color: "#555555", fontSize: 12, marginBottom: 6 }}>오늘 먹을 수 있는 마쉬멜로</p>
          <p style={{
            fontSize: 52,
            fontWeight: 900,
            color: isOver ? "#F87171" : "#F0A0BB",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}>
            {budget.toLocaleString("ko-KR")}
          </p>
          <p style={{ color: "#444444", fontSize: 11, marginTop: 4 }}>개</p>

          {/* 진행 바 */}
          <div style={{ margin: "14px 20px 10px" }}>
            <div style={{ height: 6, borderRadius: 99, background: "#333131" }}>
              <div style={{
                height: 6, borderRadius: 99,
                width: `${ratio * 100}%`,
                background: isOver ? "#F87171" : "#F0A0BB",
                transition: "width 300ms ease",
              }} />
            </div>
          </div>

          <p style={{ color: "#444444", fontSize: 12 }}>
            {daysLeft > 0 ? `${daysLeft}일 뒤 봉지가 리셋돼요` : "오늘 봉지가 리셋돼요"}
          </p>
        </div>

        {/* 먹음 / 남음 */}
        {(spent > 0 || isOver) && (
          <div style={{ display: "flex", justifyContent: "space-between", margin: "0 4px 16px" }}>
            <div>
              <p style={{ color: "#444444", fontSize: 11, marginBottom: 2 }}>먹음</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 700 }}>{formatMarshmallow(spent)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: "#444444", fontSize: 11, marginBottom: 2 }}>{isOver ? "초과" : "남음"}</p>
              <p style={{ color: isOver ? "#F87171" : "#6EE7B7", fontSize: 15, fontWeight: 700 }}>
                {isOver ? `-${formatMarshmallow(Math.abs(todaySummary?.saved ?? 0))}` : formatMarshmallow(remaining)}
              </p>
            </div>
          </div>
        )}

        {/* 먹기 / 참기 버튼 */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => setEatOpen(true)}
            style={{
              flex: 1, height: 58, borderRadius: 999,
              background: "#FFFFFF", color: "#111111",
              fontWeight: 800, fontSize: 20, border: "none",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}
          >
            먹기
          </button>
          <button
            onClick={() => setResistOpen(true)}
            style={{
              flex: 1, height: 58, borderRadius: 999,
              background: "#2E2C2C", color: "#FFFFFF",
              fontWeight: 800, fontSize: 20, border: "none",
            }}
          >
            참기
          </button>
        </div>

        {/* 핑크 CTA */}
        <button
          onClick={() => setResistOpen(true)}
          style={{
            width: "100%", height: 54, borderRadius: 16,
            background: "linear-gradient(135deg, #E06090, #F0A0BB)",
            color: "#FFFFFF", fontWeight: 800, fontSize: 16, border: "none",
            boxShadow: "0 4px 16px rgba(224,96,144,0.4)",
          }}
        >
          지금 참을게요! 🔥
        </button>
      </div>

      {/* 봉지 묶기 */}
      <div style={{ margin: "20px 20px 0" }}>
        <QuickResistBar />
      </div>

      {/* 목표 봉지 */}
      {progressList.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>목표 봉지</span>
            <span style={{ color: "#555555", fontSize: 13 }}>전체보기 →</span>
          </div>
          <div style={{ display: "flex", gap: 14, paddingLeft: 20, overflowX: "auto", paddingBottom: 4 }}>
            {progressList.map(({ item, daysNeeded, alreadyAchievable }) => {
              const pct = Math.min(Math.round((item.current_amount / item.price) * 100), 100);
              return (
                <div
                  key={item.id}
                  style={{
                    minWidth: 160,
                    background: "#252323",
                    borderRadius: 20,
                    overflow: "hidden",
                    border: alreadyAchievable ? "1.5px solid #6EE7B7" : "1.5px solid #333131",
                  }}
                >
                  {/* 이미지 영역 */}
                  <div style={{
                    height: 120,
                    background: item.image_url
                      ? `url(${item.image_url}) center/cover`
                      : "linear-gradient(135deg, #3A3838, #2E2C2C)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 40,
                  }}>
                    {!item.image_url && "🎁"}
                  </div>
                  {/* 텍스트 */}
                  <div style={{ padding: "12px 12px 14px" }}>
                    <p style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </p>
                    <p style={{ color: "#666666", fontSize: 11, marginBottom: 8 }}>
                      {formatMarshmallow(item.current_amount)} / {formatMarshmallow(item.price)}
                    </p>
                    {/* 진행바 */}
                    <div style={{ height: 4, borderRadius: 99, background: "#3A3838" }}>
                      <div style={{
                        height: 4, borderRadius: 99,
                        width: `${pct}%`,
                        background: alreadyAchievable ? "#6EE7B7" : "#F0A0BB",
                      }} />
                    </div>
                    {!alreadyAchievable && daysNeeded > 0 && (
                      <p style={{ color: "#555555", fontSize: 10, marginTop: 6 }}>⏰ {daysNeeded}일 더</p>
                    )}
                    {alreadyAchievable && (
                      <p style={{ color: "#6EE7B7", fontSize: 10, marginTop: 6 }}>🎉 지금 구울 수 있어요!</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ minWidth: 20 }} />
          </div>
        </div>
      )}

      {/* 오늘 지출 내역 */}
      {todayExpenses.length > 0 && (
        <div style={{ margin: "24px 20px 0" }}>
          <p style={{ color: "#555555", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>오늘 먹은 마쉬멜로</p>
          {todayExpenses.map((e) => (
            <div key={e.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid #2A2828",
            }}>
              <span style={{ color: "#777777", fontSize: 14 }}>{e.note || "마쉬멜로"}</span>
              <span style={{ color: "#F0A0BB", fontSize: 14, fontWeight: 700 }}>{formatMarshmallow(e.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
      <ExpenseInputSheet open={eatOpen} onClose={() => setEatOpen(false)} />
      <ResistSheet open={resistOpen} onClose={() => setResistOpen(false)} />
    </div>
  );
}

function MotivationCard({ spent, budget, remainingDays }: { spent: number; budget: number; remainingDays: number }) {
  const hour = new Date().getHours();
  let msg = "오늘도 말랑이와 함께해요 🍥";
  if (spent === 0 && hour >= 20) msg = "오늘 하나도 안 먹었네요! 잘했어요 🌙";
  else if (spent === 0) msg = "아직 마쉬멜로를 먹지 않았어요. 오늘 참아볼까요? 💪";
  else if (budget > 0 && spent >= budget) msg = "오늘 예산을 다 썼어요. 내일 더 아껴봐요 🌱";
  else if (budget > 0 && spent / budget < 0.3) msg = "잘 아끼고 있어요! 이대로만 가요 🔥";
  else msg = "조금만 더 참으면 마쉬멜로가 쌓여요 ⭐";

  return (
    <div style={{ margin: "0 20px 0", background: "#FFFFFF", borderRadius: 20, padding: "14px 18px" }}>
      <p style={{ color: "#333333", fontSize: 14, fontWeight: 600 }}>{msg}</p>
    </div>
  );
}

export default function Home() {
  return (
    <DataLoader>
      <Dashboard />
    </DataLoader>
  );
}
