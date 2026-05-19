"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import {
  useTodaySummary,
  useRemainingBudget,
  useCycleSummary,
  useWishlistProgress,
  useActiveLockPeriod,
} from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { ExpenseInputSheet } from "@/components/ExpenseInputSheet";
import { ResistSheet } from "@/components/ResistSheet";
import { LockSheet } from "@/components/LockSheet";
import { QuickResistBar } from "@/components/dashboard/QuickResistBar";
import { PaydayAlert } from "@/components/PaydayAlert";
import { formatMarshmallow, today, diffDays } from "@/lib/utils";

const BURG = "#5C3030";
const GREEN = "#4B7860";
const PINK = "#D4908A";

function Dashboard() {
  const [eatOpen, setEatOpen] = useState(false);
  const [resistOpen, setResistOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);

  const profile = useAppStore((s) => s.profile);
  const cycle = useAppStore((s) => s.cycle);
  const isLoading = useAppStore((s) => s.isLoading);
  const expenses = useAppStore((s) => s.expenses);

  const todaySummary = useTodaySummary();
  const { remainingDays, remainingBalance } = useRemainingBudget();
  const { totalSaved, totalSpent, elapsedDays } = useCycleSummary();
  const progressList = useWishlistProgress();
  const activeLock = useActiveLockPeriod();

  if (isLoading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text3)" }}>불러오는 중...</span>
      </div>
    );
  }

  const budget = todaySummary?.budget ?? 0;
  const spent = todaySummary?.spent ?? 0;
  const isOver = (todaySummary?.saved ?? 0) < 0;
  const daysLeft = cycle ? Math.max(0, diffDays(today(), cycle.next_payday)) : 0;

  // 동기부여 메시지 (설계서 7가지 룰)
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const daysToSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek);
  const avgDailySpend = elapsedDays > 0 ? totalSpent / elapsedDays : 0;
  const nearSoonGoal = progressList.find((p) => p.daysNeeded > 0 && p.daysNeeded <= 7);

  let motivation: string;
  if (spent === 0 && hour >= 22) motivation = "오늘 마쉬멜로를 하나도 먹지 않았네요! 잘했어요 🌙";
  else if (spent === 0) motivation = "아직 안 먹었어요. 오늘 참아볼까요? ☁️";
  else if (daysLeft <= 3 && daysLeft > 0) motivation = `다음 마쉬멜로까지 ${daysLeft}일! 마지막 스퍼트 💪`;
  else if (nearSoonGoal) motivation = `${nearSoonGoal.daysNeeded}일 뒤 ${nearSoonGoal.item.name} 완성! 거의 다 왔어요 🎮`;
  else if (daysToSaturday === 2 && remainingBalance > 0) motivation = `토요일까지 참으면 ${formatMarshmallow(remainingBalance)}이 쌓여요! 🔥`;
  else if (budget > 0 && spent > budget) motivation = "오늘은 봉지 좀 헤펐네요. 내일은 같이 참아봐요 🌱";
  else if (elapsedDays > 2 && avgDailySpend > 0 && spent < avgDailySpend * 0.5) motivation = "오늘 마쉬멜로 많이 아꼈네요! 👏";
  else if (((hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 20)) && budget > spent) motivation = `오늘 ${formatMarshmallow(budget - spent)} 더 먹을 수 있어요`;
  else motivation = "오늘도 말랑이와 함께해요 ☁️";

  const todayExpenses = expenses.filter((e) => e.date === today());

  return (
    <div className="page-fade" style={{ background: "var(--bg)", minHeight: "100vh", paddingBottom: 90 }}>

      {/* ── 헤더 ── */}
      <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: BURG, fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px" }}>Mallang</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {totalSaved > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>
              🔥 {formatMarshmallow(totalSaved)} 구움
            </span>
          )}
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F5EDED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {profile?.nickname?.[0] ?? "🍥"}
          </div>
        </div>
      </div>

      <PaydayAlert />

      {/* ── 동기부여 배너 ── */}
      <div style={{ margin: "0 20px 16px", background: "var(--banner)", borderRadius: 16, padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>☽</span>
        <p style={{ color: "var(--banner-text)", fontSize: 13, fontWeight: 600, flex: 1 }}>{motivation}</p>
      </div>

      {/* ── 메인 2열 카드 ── */}
      <div style={{ margin: "0 20px 20px", display: "flex", gap: 12 }}>

        {/* 잔액 카드 */}
        <div style={{
          flex: 1, background: "#FFFFFF", borderRadius: 20, padding: "18px 16px",
          boxShadow: "0 2px 12px var(--shadow)",
        }}>
          <p style={{ color: "var(--text3)", fontSize: 9, fontWeight: 700, letterSpacing: "1px", marginBottom: 8 }}>AVAILABLE BALANCE</p>
          <p style={{
            fontSize: 32, fontWeight: 900, color: isOver ? "#B04040" : BURG,
            letterSpacing: "-1px", lineHeight: 1, marginBottom: 2,
          }}>
            {budget.toLocaleString("ko-KR")}
          </p>
          <p style={{ color: "var(--text2)", fontSize: 11, marginBottom: 14 }}>남은 마쉬멜로</p>

          {/* 먹기 / 굽기 버튼 */}
          {!activeLock ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                onClick={() => setEatOpen(true)}
                style={{
                  flex: 1, height: 36, borderRadius: 999, fontSize: 13, fontWeight: 700,
                  background: BURG, color: "#FFFFFF", border: "none",
                }}
              >
                🍽 먹기
              </button>
              <button
                onClick={() => setLockOpen(true)}
                style={{
                  flex: 1, height: 36, borderRadius: 999, fontSize: 13, fontWeight: 700,
                  background: GREEN, color: "#FFFFFF", border: "none",
                }}
              >
                🔒 굽기
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <QuickResistBar />
            </div>
          )}

          {/* 진행 바 */}
          <div style={{ height: 5, borderRadius: 99, background: "var(--burg-light)", marginBottom: 6 }}>
            <div style={{
              height: 5, borderRadius: 99,
              width: `${budget > 0 ? Math.min((spent / budget) * 100, 100) : 0}%`,
              background: isOver ? "#B04040" : BURG, transition: "width 400ms ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text3)", fontSize: 10 }}>먹음 {formatMarshmallow(spent)}</span>
            <span style={{ color: "var(--text3)", fontSize: 10 }}>{daysLeft}일 남음</span>
          </div>
        </div>

        {/* 참기의 미학 카드 */}
        <div style={{
          flex: 1, background: "#FFFFFF", borderRadius: 20, padding: "18px 16px",
          boxShadow: "0 2px 12px var(--shadow)", display: "flex", flexDirection: "column",
        }}>
          <p style={{ color: BURG, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>참기의 미학</p>
          <p style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.5, flex: 1, marginBottom: 14 }}>
            마쉬멜로를 굽지 않고 지금 참으면, 나중에 더 큰 보상을 받을 수 있습니다. 당신의 인내심을 기록하세요.
          </p>
          <button
            onClick={() => setResistOpen(true)}
            style={{
              width: "100%", height: 42, borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: PINK, color: "#FFFFFF", border: "none",
              boxShadow: "0 4px 12px rgba(212,144,138,0.35)",
            }}
          >
            🔥 지금 참을게요
          </button>
        </div>
      </div>

      {/* ── 목표 가방 섹션 ── */}
      <div style={{ margin: "0 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 17 }}>나의 목표 가방</p>
          <p style={{ color: "var(--text2)", fontSize: 12 }}>소중하게 모으고 있는 마쉬멜로 목표들</p>
        </div>
        <a href="/bags" style={{ color: BURG, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          모두 보기 →
        </a>
      </div>

      <div style={{ display: "flex", gap: 14, paddingLeft: 20, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
        {progressList.map(({ item, daysNeeded, alreadyAchievable }) => {
          const pct = Math.min(Math.round((item.current_amount / item.price) * 100), 100);
          return (
            <a key={item.id} href="/bags" style={{ textDecoration: "none" }}>
              <div style={{
                minWidth: 148, background: "#FFFFFF", borderRadius: 18,
                padding: "14px 14px 12px", flexShrink: 0,
                boxShadow: "0 2px 10px var(--shadow)",
                border: alreadyAchievable ? `1.5px solid ${GREEN}` : "none",
              }}>
                {/* 아이콘 */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12, marginBottom: 8,
                  background: item.image_url ? `url(${item.image_url}) center/cover` : "var(--burg-light)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>
                  {!item.image_url && "🎁"}
                </div>
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                  {item.name}
                </p>
                <p style={{ color: alreadyAchievable ? GREEN : BURG, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                  {alreadyAchievable ? "완성 가능! 🎉" : `${pct}% 달성`}
                </p>
                <div style={{ height: 4, borderRadius: 99, background: "var(--burg-light)", marginBottom: 6 }}>
                  <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: alreadyAchievable ? GREEN : BURG }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text3)", fontSize: 10 }}>{item.current_amount.toLocaleString()}</span>
                  <span style={{ color: "var(--text3)", fontSize: 10 }}>{item.price.toLocaleString()}</span>
                </div>
              </div>
            </a>
          );
        })}

        {/* 새 목표 추가 카드 */}
        <a href="/bags" style={{ textDecoration: "none" }}>
          <div style={{
            minWidth: 120, height: "100%", minHeight: 160, borderRadius: 18, flexShrink: 0,
            border: "1.5px dashed var(--border)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--burg-light)", display: "flex", alignItems: "center", justifyContent: "center", color: BURG, fontSize: 20, fontWeight: 300 }}>
              +
            </div>
            <p style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600, textAlign: "center" }}>새로운 목표<br />추가</p>
          </div>
        </a>
        <div style={{ minWidth: 20, flexShrink: 0 }} />
      </div>

      {/* ── 하단 통계 2열 ── */}
      <div style={{ margin: "20px 20px 0", display: "flex", gap: 12 }}>

        {/* 이번 주 참기 통계 */}
        <div style={{ flex: 1.4, background: "#FFFFFF", borderRadius: 20, padding: "16px", boxShadow: "0 2px 10px var(--shadow)" }}>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>이번 주 참기 통계</p>
          <p style={{ color: GREEN, fontSize: 11, marginBottom: 14 }}>
            {totalSaved > 0 ? `${formatMarshmallow(totalSaved)} 구웠어요. 대단해요!` : "오늘부터 시작해봐요!"}
          </p>
          {/* 미니 바 차트 - 최근 7일 */}
          <MiniBarChart expenses={expenses} />
        </div>

        {/* 뱃지 카드 */}
        <div style={{ flex: 1, background: "#FFFFFF", borderRadius: 20, padding: "16px", boxShadow: "0 2px 10px var(--shadow)" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>달콤한 인내 전문가</p>
          <p style={{ color: "var(--text2)", fontSize: 11, lineHeight: 1.4 }}>
            {daysLeft > 0 ? `배지 획득까지 ${daysLeft}일 남음` : "이번 봉지 완성!"}
          </p>
        </div>
      </div>

      {/* ── 오늘 먹은 목록 ── */}
      {todayExpenses.length > 0 && (
        <div style={{ margin: "20px 20px 0" }}>
          <p style={{ color: "var(--text2)", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>오늘 먹은 마쉬멜로</p>
          <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px var(--shadow)" }}>
            {todayExpenses.map((e, i) => (
              <div key={e.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px",
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ color: "var(--text)", fontSize: 14 }}>{e.note || "마쉬멜로"}</span>
                <span style={{ color: BURG, fontSize: 14, fontWeight: 700 }}>{formatMarshmallow(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
      <ExpenseInputSheet open={eatOpen} onClose={() => setEatOpen(false)} />
      <ResistSheet open={resistOpen} onClose={() => setResistOpen(false)} />
      <LockSheet open={lockOpen} onClose={() => setLockOpen(false)} />
    </div>
  );
}

function MiniBarChart({ expenses }: { expenses: { date: string; amount: number }[] }) {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const spentByDay = days.map((date) =>
    expenses.filter((e) => e.date === date).reduce((sum, e) => sum + e.amount, 0)
  );
  const max = Math.max(...spentByDay, 1);
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const todayIdx = new Date().getDay();

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 48 }}>
      {spentByDay.map((val, i) => {
        const dayLabel = dayLabels[(new Date(days[i]).getDay())];
        const isToday = i === 6;
        const heightPct = max > 0 ? (val / max) * 100 : 4;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: "100%", borderRadius: 4,
              height: `${Math.max(heightPct * 0.38, 4)}px`,
              background: isToday ? BURG : "var(--burg-light)",
            }} />
            <span style={{ fontSize: 9, color: isToday ? BURG : "var(--text3)", fontWeight: isToday ? 700 : 400 }}>
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  return <DataLoader><Dashboard /></DataLoader>;
}
