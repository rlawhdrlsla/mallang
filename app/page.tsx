"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useCycleSummary } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { TodayBudgetCard } from "@/components/dashboard/TodayBudgetCard";
import { WishlistCard } from "@/components/dashboard/WishlistCard";
import { TodayExpenseList } from "@/components/dashboard/TodayExpenseList";
import { QuickResistBar } from "@/components/dashboard/QuickResistBar";
import { ExpenseInputSheet } from "@/components/ExpenseInputSheet";
import { formatMarshmallow, formatDate, today } from "@/lib/utils";
import { PaydayAlert } from "@/components/PaydayAlert";

function Dashboard() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const profile = useAppStore((s) => s.profile);
  const isLoading = useAppStore((s) => s.isLoading);
  const { totalSaved } = useCycleSummary();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: "#BBBBBB" }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="page-fade pb-[160px]">
      {/* 헤더 */}
      <div className="px-5 pt-12 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-bold" style={{ color: "#111111" }}>
              {profile?.nickname}의 말랑이 🍥
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#BBBBBB" }}>
              {formatDate(today())}
            </p>
          </div>
          {/* 누적 스코어 */}
          {totalSaved > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: "#ECFDF5" }}
            >
              <span className="text-base">🔥</span>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: "#059669" }}>구운 마쉬멜로</p>
                <p className="text-sm font-extrabold" style={{ color: "#059669" }}>
                  {formatMarshmallow(totalSaved)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 월급일 경고 */}
      <PaydayAlert />

      {/* 카드 목록 */}
      <div className="px-5 space-y-3">
        {/* 오늘 마쉬멜로 (이모지 그리드 + 내일 미리보기) */}
        <TodayBudgetCard />

        {/* 봉지 묶기 */}
        <QuickResistBar />

        {/* 목표 봉지 */}
        <WishlistCard />

        {/* 오늘 먹은 마쉬멜로 목록 */}
        <TodayExpenseList />
      </div>

      {/* 하단 고정 버튼 */}
      <div
        className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full px-5 z-30"
        style={{ maxWidth: 480 }}
      >
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full h-[54px] rounded-xl text-base font-bold text-white btn-press shadow-lg"
          style={{ background: "#111111" }}
        >
          🍥 마쉬멜로 먹기
        </button>
      </div>

      <BottomNav />
      <ExpenseInputSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
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
