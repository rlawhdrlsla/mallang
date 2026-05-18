"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useRemainingBudget } from "@/lib/hooks";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatMarshmallow, today, diffDays } from "@/lib/utils";
import { LockReason } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface LockSheetProps {
  open: boolean;
  onClose: () => void;
}

type Option = { label: string; days: number; reason: LockReason };

const OPTIONS: Option[] = [
  { label: "1주일", days: 7, reason: "WEEK1" },
  { label: "2주일", days: 14, reason: "WEEK2" },
  { label: "한달", days: 30, reason: "MONTH1" },
];

export function LockSheet({ open, onClose }: LockSheetProps) {
  const cycle = useAppStore((s) => s.cycle);
  const addLockPeriod = useAppStore((s) => s.addLockPeriod);
  const { remainingBalance, remainingDays } = useRemainingBudget();

  const [selected, setSelected] = useState<Option | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!cycle) return null;

  const maxDays = Math.max(0, diffDays(today(), cycle.next_payday));
  const dailyBudget = remainingDays > 0 ? Math.floor(remainingBalance / remainingDays) : 0;

  function getAccumulated(days: number): number {
    return dailyBudget * Math.min(days, maxDays);
  }

  const customDays = customDate ? Math.max(0, diffDays(today(), customDate) + 1) : 0;

  function handleClose() {
    setSelected(null);
    setCustomDate("");
    setShowCustom(false);
    onClose();
  }

  async function handleConfirmLock(endDate: string, reason: LockReason) {
    if (!cycle) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase
      .from("lock_periods")
      .insert({
        cycle_id: cycle.id,
        user_id: user.id,
        start_date: today(),
        end_date: endDate,
        reason,
        is_active: true,
      })
      .select().single();

    if (!error && data) addLockPeriod(data);
    setSaving(false);
    handleClose();
  }

  function getEndDate(days: number): string {
    const d = new Date(today() + "T00:00:00");
    d.setDate(d.getDate() + Math.min(days, maxDays) - 1);
    return d.toISOString().slice(0, 10);
  }

  // 확인 단계
  if (selected || (showCustom && customDate && customDays > 0)) {
    const isCustomMode = showCustom;
    const days = isCustomMode ? customDays : selected!.days;
    const reason: LockReason = isCustomMode ? "CUSTOM" : selected!.reason;
    const accumulated = isCustomMode ? getAccumulated(customDays) : getAccumulated(days);
    const label = isCustomMode ? `${customDays}일` : selected!.label;
    const endDate = isCustomMode ? customDate : getEndDate(days);

    return (
      <BottomSheet open={open} onClose={handleClose} title="봉지 묶기 🪢">
        <div style={{ padding: "8px 20px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#F8F7F4", borderRadius: 20, padding: "24px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: "#111111" }}>{label} 참기</p>
            <p style={{ fontSize: 14, color: "#6B6B6B", marginTop: 8 }}>
              {Math.min(days, maxDays)}일 동안 마쉬멜로를 먹지 않으면
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#059669", marginTop: 6 }}>
              {formatMarshmallow(accumulated)} 쌓여요!
            </p>
            <p style={{ fontSize: 12, color: "#BBBBBB", marginTop: 8 }}>{endDate}까지</p>
          </div>
          <p style={{ color: "#BBBBBB", fontSize: 12, textAlign: "center" }}>
            비상시 풀 수 있지만, 쌓인 마쉬멜로가 다시 풀려요
          </p>
          <button
            onClick={() => handleConfirmLock(endDate, reason)}
            disabled={saving}
            style={{
              width: "100%", height: 54, borderRadius: 14, fontSize: 16, fontWeight: 700,
              background: saving ? "#BBBBBB" : "#111111", color: "#FFFFFF", border: "none",
            }}
          >
            {saving ? "처리 중..." : "봉지 묶기!"}
          </button>
          <button
            onClick={() => { setSelected(null); setShowCustom(false); }}
            style={{
              width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: "#F0EEE8", color: "#111111", border: "none",
            }}
          >
            뒤로
          </button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="봉지 묶기 🪢">
      <div style={{ padding: "8px 20px 32px" }}>
        <p style={{ color: "#888888", fontSize: 13, marginBottom: 16 }}>
          참는 기간 동안 마쉬멜로를 먹지 않아요
        </p>

        {/* 프리셋 3개 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {OPTIONS.map((opt) => {
            const effectiveDays = Math.min(opt.days, maxDays);
            const accumulated = getAccumulated(effectiveDays);
            return (
              <button
                key={opt.reason}
                onClick={() => setSelected(opt)}
                disabled={maxDays <= 0}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "14px 4px", borderRadius: 14,
                  background: "#F8F7F4", border: "1px solid #E8E6DF",
                  opacity: maxDays <= 0 ? 0.4 : 1, cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111111" }}>{opt.label}</span>
                <span style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>+{formatMarshmallow(accumulated)}</span>
              </button>
            );
          })}
        </div>

        {/* 날짜 직접 고르기 */}
        <div style={{ background: "#F8F7F4", borderRadius: 16, padding: "16px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111111", marginBottom: 10 }}>날짜 직접 고르기</p>
          <input
            type="date"
            value={customDate}
            min={today()}
            max={cycle.next_payday}
            onChange={(e) => setCustomDate(e.target.value)}
            style={{
              width: "100%", height: 44, padding: "0 14px", borderRadius: 10,
              fontSize: 14, outline: "none", border: "1px solid #E8E6DF",
              background: "#FFFFFF", color: "#111111", marginBottom: 10,
            }}
          />
          {customDate && customDays > 0 && (
            <p style={{ fontSize: 13, textAlign: "center", color: "#6B6B6B", marginBottom: 10 }}>
              {customDays}일 동안 참으면{" "}
              <strong style={{ color: "#059669" }}>{formatMarshmallow(getAccumulated(customDays))}</strong> 쌓여요
            </p>
          )}
          <button
            onClick={() => setShowCustom(true)}
            disabled={!customDate || customDays <= 0}
            style={{
              width: "100%", height: 42, borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: customDate && customDays > 0 ? "#111111" : "#BBBBBB",
              color: "#FFFFFF", border: "none",
            }}
          >
            이 날까지 참기
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
