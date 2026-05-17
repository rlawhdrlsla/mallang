"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { TodayBudgetCard } from "@/components/dashboard/TodayBudgetCard";
import { TomorrowBudgetCard } from "@/components/dashboard/TomorrowBudgetCard";
import { WishlistCard } from "@/components/dashboard/WishlistCard";
import { CycleSummaryCard } from "@/components/dashboard/CycleSummaryCard";
import { TodayExpenseList } from "@/components/dashboard/TodayExpenseList";
import { ExpenseInputSheet } from "@/components/ExpenseInputSheet";
import { formatDate, today } from "@/lib/utils";
import { PaydayAlert } from "@/components/PaydayAlert";

function Dashboard() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const profile = useAppStore((s) => s.profile);
  const isLoading = useAppStore((s) => s.isLoading);

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
      <div className="px-5 pt-12 pb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#888888" }}>
            안녕하세요, {profile?.nickname}님
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#BBBBBB" }}>
            {formatDate(today())}
          </p>
        </div>
      </div>

      {/* 월급일 경고 */}
      <PaydayAlert />

      {/* 카드 목록 */}
      <div className="px-5 space-y-3">
        <TodayBudgetCard />
        <TomorrowBudgetCard />
        <WishlistCard />
        <CycleSummaryCard />
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
          style={{ background: "#FF6B35" }}
        >
          + 지출 추가
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
