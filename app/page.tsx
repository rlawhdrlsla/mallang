"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useTodaySummary, useRemainingBudget, useCycleSummary, useWishlistProgress } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { ExpenseInputSheet } from "@/components/ExpenseInputSheet";
import { ResistSheet } from "@/components/ResistSheet";
import { QuickResistBar } from "@/components/dashboard/QuickResistBar";
import { PaydayAlert } from "@/components/PaydayAlert";
import { formatMarshmallow, today, diffDays } from "@/lib/utils";

const HOME_BG = "#1C1818";
const PINK = "#F0A0BB";
const PINK_BTN = "#E06090";

function Dashboard() {
  const [eatOpen, setEatOpen] = useState(false);
  const [resistOpen, setResistOpen] = useState(false);

  const profile = useAppStore((s) => s.profile);
  const cycle = useAppStore((s) => s.cycle);
  const isLoading = useAppStore((s) => s.isLoading);
  const expenses = useAppStore((s) => s.expenses);
  const todaySummary = useTodaySummary();
  const { remainingDays } = useRemainingBudget();
  const { totalSaved } = useCycleSummary();
  const progressList = useWishlistProgress();

  if (isLoading) {
    return (
      <div style={{ background: HOME_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#555" }}>불러오는 중...</span>
      </div>
    );
  }

  const budget = todaySummary?.budget ?? 0;
  const spent = todaySummary?.spent ?? 0;
  const isOver = (todaySummary?.saved ?? 0) < 0;
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const daysLeft = cycle ? Math.max(0, diffDays(today(), cycle.next_payday)) : 0;

  // 동기부여 메시지
  const hour = new Date().getHours();
  let motivation = "오늘도 말랑이와 함께해요 🍥";
  if (spent === 0 && hour >= 20) motivation = "오늘 하나도 안 먹었네요! 잘했어요 🌙";
  else if (spent === 0) motivation = "아직 안 먹었어요. 오늘 참아볼까요? 💪";
  else if (budget > 0 && spent >= budget) motivation = "오늘 예산을 다 썼어요. 내일 더 아껴봐요 🌱";
  else if (budget > 0 && spent / budget < 0.4) motivation = "잘 아끼고 있어요! 이대로만 가요 🔥";
  else motivation = "조금만 더 참으면 마쉬멜로가 쌓여요 ⭐";

  const todayExpenses = expenses.filter((e) => e.date === today());

  return (
    <div className="page-fade" style={{ background: HOME_BG, minHeight: "100vh", paddingBottom: 100 }}>

      {/* ── 헤더 ── */}
      <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2A2828", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            🍥
          </div>
          <span style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 18 }}>Mallang</span>
        </div>
        {totalSaved > 0 && (
          <div style={{ background: "#2A2828", borderRadius: 99, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12 }}>🔥</span>
            <span style={{ color: PINK, fontWeight: 700, fontSize: 12 }}>{formatMarshmallow(totalSaved)}</span>
          </div>
        )}
      </div>

      <PaydayAlert />

      {/* ── 동기부여 카드 ── */}
      <div style={{ margin: "0 20px 16px", background: "#FFFFFF", borderRadius: 18, padding: "14px 18px" }}>
        <p style={{ color: "#333", fontSize: 14, fontWeight: 600 }}>{motivation}</p>
      </div>

      {/* ── 마쉬멜로 캐릭터 + 숫자 ── */}
      <div style={{ margin: "0 20px" }}>
        <div style={{ background: "#242222", borderRadius: 24, padding: "24px 20px 22px", textAlign: "center" }}>
          {/* 캐릭터 */}
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16 }}>🍥</div>

          {/* 라벨 */}
          <p style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>오늘 먹을 수 있는 마쉬멜로</p>

          {/* 메인 숫자 */}
          <p style={{
            fontSize: 54, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1,
            color: isOver ? "#F87171" : PINK,
          }}>
            {budget.toLocaleString("ko-KR")}
          </p>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>개</p>

          {/* 진행 바 (시각적으로만 — 숫자 없음) */}
          <div style={{ height: 8, borderRadius: 99, background: "#333131", marginBottom: 10 }}>
            <div style={{
              height: 8, borderRadius: 99, transition: "width 400ms ease",
              width: `${ratio * 100}%`,
              background: isOver ? "#F87171" : `linear-gradient(90deg, ${PINK_BTN}, ${PINK})`,
            }} />
          </div>

          {/* 하단 텍스트 */}
          <p style={{ color: "#444", fontSize: 12 }}>
            {daysLeft > 0 ? `${daysLeft}일 뒤 봉지가 리셋돼요` : "오늘 봉지가 리셋돼요"}
          </p>
        </div>

        {/* ── 먹기 / 참기 ── */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, marginBottom: 12 }}>
          <button
            onClick={() => setEatOpen(true)}
            style={{
              flex: 1, height: 60, borderRadius: 999, fontSize: 20, fontWeight: 800,
              background: "#FFFFFF", color: HOME_BG, border: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            먹기
          </button>
          <button
            onClick={() => setResistOpen(true)}
            style={{
              flex: 1, height: 60, borderRadius: 999, fontSize: 20, fontWeight: 800,
              background: "#2E2C2C", color: "#FFFFFF", border: "none",
            }}
          >
            참기
          </button>
        </div>

        {/* ── 핑크 CTA ── */}
        <button
          onClick={() => setResistOpen(true)}
          style={{
            width: "100%", height: 56, borderRadius: 16, fontSize: 16, fontWeight: 800,
            background: `linear-gradient(135deg, ${PINK_BTN}, ${PINK})`,
            color: "#FFFFFF", border: "none",
            boxShadow: `0 6px 20px rgba(224,96,144,0.45)`,
          }}
        >
          지금 참을게요! 🔥
        </button>
      </div>

      {/* ── 봉지 묶기 ── */}
      <div style={{ margin: "20px 20px 0" }}>
        <QuickResistBar />
      </div>

      {/* ── 목표 봉지 미리보기 ── */}
      {progressList.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>목표 봉지</span>
            <a href="/history" style={{ color: "#666", fontSize: 13, textDecoration: "none" }}>전체보기 →</a>
          </div>
          <div style={{ display: "flex", gap: 14, paddingLeft: 20, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
            {progressList.map(({ item, daysNeeded, alreadyAchievable }) => {
              const pct = Math.min(Math.round((item.current_amount / item.price) * 100), 100);
              return (
                <div key={item.id} style={{
                  minWidth: 155, background: "#252323", borderRadius: 18, overflow: "hidden",
                  border: `1.5px solid ${alreadyAchievable ? "#6EE7B7" : "#333131"}`,
                  flexShrink: 0,
                }}>
                  <div style={{
                    height: 110, background: item.image_url ? `url(${item.image_url}) center/cover` : `linear-gradient(135deg, #3A3838, #2A2828)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44,
                  }}>
                    {!item.image_url && "🎁"}
                  </div>
                  <div style={{ padding: "10px 12px 14px" }}>
                    <p style={{ color: "#FFF", fontSize: 13, fontWeight: 700, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </p>
                    <div style={{ height: 4, borderRadius: 99, background: "#3A3838", marginBottom: 6 }}>
                      <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: alreadyAchievable ? "#6EE7B7" : PINK }} />
                    </div>
                    <p style={{ color: "#555", fontSize: 11 }}>
                      {alreadyAchievable ? "🎉 완성 가능!" : daysNeeded > 0 ? `⏰ ${daysNeeded}일 더` : "적립 중"}
                    </p>
                  </div>
                </div>
              );
            })}
            <div style={{ minWidth: 20, flexShrink: 0 }} />
          </div>
        </div>
      )}

      {/* ── 오늘 먹은 목록 ── */}
      {todayExpenses.length > 0 && (
        <div style={{ margin: "28px 20px 0" }}>
          <p style={{ color: "#555", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>오늘 먹은 마쉬멜로</p>
          {todayExpenses.map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #2A2828" }}>
              <span style={{ color: "#666", fontSize: 14 }}>{e.note || "마쉬멜로"}</span>
              <span style={{ color: PINK, fontSize: 14, fontWeight: 700 }}>{formatMarshmallow(e.amount)}</span>
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

export default function Home() {
  return <DataLoader><Dashboard /></DataLoader>;
}
