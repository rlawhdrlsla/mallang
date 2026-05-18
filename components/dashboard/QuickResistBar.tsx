"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useActiveLockPeriod, useRemainingBudget } from "@/lib/hooks";
import { formatMarshmallow, today, diffDays } from "@/lib/utils";
import { LockReason } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { BottomSheet } from "@/components/ui/BottomSheet";

type Option = { label: string; days: number; reason: LockReason };

const OPTIONS: Option[] = [
  { label: "1주일", days: 7, reason: "WEEK1" },
  { label: "2주일", days: 14, reason: "WEEK2" },
  { label: "한달", days: 30, reason: "MONTH1" },
];

export function QuickResistBar() {
  const cycle = useAppStore((s) => s.cycle);
  const addLockPeriod = useAppStore((s) => s.addLockPeriod);
  const deactivateLockPeriod = useAppStore((s) => s.deactivateLockPeriod);
  const activeLock = useActiveLockPeriod();
  const { remainingBalance, remainingDays } = useRemainingBudget();

  const [selected, setSelected] = useState<Option | null>(null);
  const [saving, setSaving] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  if (!cycle) return null;

  // 마쉬멜로 받는 날까지 최대 일수
  const maxDays = Math.max(0, diffDays(today(), cycle.next_payday));

  function getDailyBudget() {
    if (remainingDays <= 0) return 0;
    return Math.floor(remainingBalance / remainingDays);
  }

  function getAccumulatedForDays(days: number): number {
    const effectiveDays = Math.min(days, maxDays);
    return getDailyBudget() * effectiveDays;
  }

  async function handleConfirmLock() {
    if (!selected || !cycle) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const startDate = today();
    const endD = new Date(startDate + "T00:00:00");
    endD.setDate(endD.getDate() + Math.min(selected.days, maxDays) - 1);
    const endDate = endD.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("lock_periods")
      .insert({
        cycle_id: cycle.id,
        user_id: user.id,
        start_date: startDate,
        end_date: endDate,
        reason: selected.reason,
        is_active: true,
      })
      .select().single();

    if (!error && data) addLockPeriod(data);
    setSaving(false);
    setSelected(null);
  }

  async function handleUnlock() {
    if (!activeLock) return;
    const supabase = createClient();
    await supabase
      .from("lock_periods")
      .update({ is_active: false })
      .eq("id", activeLock.id);
    deactivateLockPeriod(activeLock.id);
    setShowUnlockConfirm(false);
  }

  // 잠금 중인 경우
  if (activeLock) {
    const daysLeft = diffDays(today(), activeLock.end_date);
    const accumulated = getDailyBudget() * (diffDays(activeLock.start_date, today()) + 1);
    return (
      <div
        className="mx-0 rounded-2xl p-4"
        style={{ background: "#111111" }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold" style={{ color: "#FFFFFF" }}>
            🪢 봉지 묶는 중
          </p>
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

  return (
    <>
      <div className="rounded-2xl p-4" style={{ background: "#F8F7F4" }}>
        <p className="text-sm font-bold mb-1" style={{ color: "#111111" }}>
          🪢 봉지 묶기
        </p>
        <p className="text-xs mb-3" style={{ color: "#6B6B6B" }}>
          참는 기간 동안 마쉬멜로를 먹지 않아요
        </p>
        <div className="flex gap-2">
          {OPTIONS.map((opt) => {
            const effectiveDays = Math.min(opt.days, maxDays);
            const accumulated = getAccumulatedForDays(effectiveDays);
            return (
              <button
                key={opt.reason}
                onClick={() => setSelected(opt)}
                disabled={maxDays <= 0}
                className="flex-1 flex flex-col items-center py-2.5 rounded-xl"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E6DF",
                  opacity: maxDays <= 0 ? 0.4 : 1,
                }}
              >
                <span className="text-xs font-bold" style={{ color: "#111111" }}>{opt.label}</span>
                <span className="text-xs mt-0.5" style={{ color: "#059669" }}>+{formatMarshmallow(accumulated)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 참기 확인 시트 */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title="봉지 묶기 🪢">
        {selected && (
          <div className="px-4 pb-8 space-y-4">
            <div className="rounded-2xl p-4 text-center" style={{ background: "#F8F7F4" }}>
              <p className="text-2xl font-extrabold" style={{ color: "#111111" }}>
                {selected.label} 참기
              </p>
              <p className="text-sm mt-2" style={{ color: "#6B6B6B" }}>
                {Math.min(selected.days, maxDays)}일 동안 마쉬멜로를 먹지 않으면
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: "#059669" }}>
                {formatMarshmallow(getAccumulatedForDays(Math.min(selected.days, maxDays)))} 쌓여요!
              </p>
            </div>
            <p className="text-xs text-center" style={{ color: "#BBBBBB" }}>
              비상시 풀 수 있지만, 쌓인 마쉬멜로가 다시 풀려요
            </p>
            <button
              onClick={handleConfirmLock}
              disabled={saving}
              className="w-full h-[54px] rounded-xl text-base font-bold text-white"
              style={{ background: saving ? "#BBBBBB" : "#111111" }}
            >
              {saving ? "처리 중..." : "봉지 묶기!"}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="w-full h-[54px] rounded-xl text-base font-bold"
              style={{ background: "#F0EEE8", color: "#111111" }}
            >
              취소
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
