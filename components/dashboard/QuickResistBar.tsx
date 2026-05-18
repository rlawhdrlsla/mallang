"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useActiveLockPeriod, useRemainingBudget } from "@/lib/hooks";
import { formatMarshmallow, today, diffDays } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { BottomSheet } from "@/components/ui/BottomSheet";

// 활성 봉지 묶기 상태만 표시. 선택 UI는 홈의 [참기] 버튼에 있음.
export function QuickResistBar() {
  const deactivateLockPeriod = useAppStore((s) => s.deactivateLockPeriod);
  const activeLock = useActiveLockPeriod();
  const { remainingBalance, remainingDays } = useRemainingBudget();
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  if (!activeLock) return null;

  const daysLeft = Math.max(0, diffDays(today(), activeLock.end_date));
  const dailyBudget = remainingDays > 0 ? Math.floor(remainingBalance / remainingDays) : 0;
  const accumulated = dailyBudget * (diffDays(activeLock.start_date, today()) + 1);

  async function handleUnlock() {
    const supabase = createClient();
    await supabase.from("lock_periods").update({ is_active: false }).eq("id", activeLock!.id);
    deactivateLockPeriod(activeLock!.id);
    setShowUnlockConfirm(false);
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: "#111111" }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold" style={{ color: "#FFFFFF" }}>🪢 봉지 묶는 중</p>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#FFFFFF" }}>
          D-{daysLeft}
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
        {activeLock.end_date}까지 · 지금까지 {formatMarshmallow(Math.max(accumulated, 0))} 쌓는 중
      </p>
      <button
        onClick={() => setShowUnlockConfirm(true)}
        className="text-xs font-semibold px-3 h-7 rounded-lg"
        style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
      >
        봉지 풀기
      </button>

      <BottomSheet open={showUnlockConfirm} onClose={() => setShowUnlockConfirm(false)} title="봉지 풀기">
        <div className="px-4 pb-8 space-y-4">
          <p className="text-sm text-center" style={{ color: "#6B6B6B" }}>
            묶어둔 마쉬멜로 {formatMarshmallow(Math.max(accumulated, 0))}를<br />이대로 쓸 수 있게 돼요
          </p>
          <button onClick={handleUnlock} className="w-full h-[54px] rounded-xl text-base font-bold text-white" style={{ background: "#DC2626" }}>
            그래도 풀게요
          </button>
          <button onClick={() => setShowUnlockConfirm(false)} className="w-full h-[54px] rounded-xl text-base font-bold" style={{ background: "#F0EEE8", color: "#111111" }}>
            계속 참을게요
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
