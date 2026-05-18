"use client";

import { useState } from "react";
import { BottomSheet } from "./ui/BottomSheet";
import { NumberPad } from "./ui/NumberPad";
import { formatMarshmallow, today, yesterday } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { useTodaySummary } from "@/lib/hooks";

interface ExpenseInputSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ExpenseInputSheet({ open, onClose }: ExpenseInputSheetProps) {
  const [step, setStep] = useState<"resist" | "input">("resist");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => today());
  const [customDate, setCustomDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const cycle = useAppStore((s) => s.cycle);
  const addExpense = useAppStore((s) => s.addExpense);
  const todaySummary = useTodaySummary();

  const todayRemaining = todaySummary ? Math.max(0, todaySummary.budget - todaySummary.spent) : 0;

  function handleClose() {
    setAmount("");
    setNote("");
    setDate(today());
    setCustomDate(false);
    setStep("resist");
    onClose();
  }

  async function handleSubmit() {
    if (!amount || !cycle) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        cycle_id: cycle.id,
        user_id: user.id,
        date,
        amount: parseInt(amount, 10),
        category: "etc",
        note,
      })
      .select()
      .single();

    if (!error && data) addExpense(data);
    setSaving(false);
    handleClose();
  }

  const canSubmit = !!amount && !saving;

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={step === "resist" ? "잠깐만요 🍥" : "마쉬멜로 먹기"}
    >
      {step === "resist" ? (
        <div className="px-4 pb-8 pt-2 space-y-5">
          {/* 오늘 남은 예산 표시 */}
          <div className="rounded-2xl p-5 text-center" style={{ background: "#F8F7F4" }}>
            <p className="text-xs mb-2" style={{ color: "#6B6B6B" }}>오늘 남은 마쉬멜로</p>
            <p className="text-4xl font-extrabold" style={{ color: todayRemaining > 0 ? "#111111" : "#DC2626" }}>
              {formatMarshmallow(todayRemaining)}
            </p>
            {todayRemaining > 0 ? (
              <p className="text-xs mt-2" style={{ color: "#059669" }}>
                참으면 오늘치 전부 구울 수 있어요 🔥
              </p>
            ) : (
              <p className="text-xs mt-2" style={{ color: "#DC2626" }}>
                오늘 예산을 다 썼어요
              </p>
            )}
          </div>

          <button
            onClick={handleClose}
            className="w-full h-[54px] rounded-xl text-base font-bold text-white"
            style={{ background: "#111111" }}
          >
            🪢 지금 참을게요
          </button>
          <button
            onClick={() => setStep("input")}
            className="w-full h-[44px] rounded-xl text-sm font-semibold"
            style={{ background: "transparent", color: "#BBBBBB" }}
          >
            그래도 먹을게요
          </button>
        </div>
      ) : (
        <>
          <div className="px-4 pt-4 pb-2">
            <div
              className="text-[40px] font-extrabold text-right"
              style={{ color: amount ? "#111111" : "#BBBBBB" }}
            >
              {amount ? formatMarshmallow(parseInt(amount, 10)) : "0개"}
            </div>
          </div>

          {/* 날짜 선택 */}
          <div className="px-4 mt-2 flex gap-2">
            {([["오늘", today()], ["어제", yesterday()]] as [string, string][]).map(([label, val]) => (
              <button
                key={label}
                onClick={() => { setDate(val); setCustomDate(false); }}
                className="h-9 px-4 rounded-lg text-sm font-semibold"
                style={{
                  background: !customDate && date === val ? "#111111" : "#F0EEE8",
                  color: !customDate && date === val ? "#FFFFFF" : "#6B6B6B",
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setCustomDate(true)}
              className="h-9 px-4 rounded-lg text-sm font-semibold"
              style={{
                background: customDate ? "#111111" : "#F0EEE8",
                color: customDate ? "#FFFFFF" : "#6B6B6B",
              }}
            >
              직접 선택
            </button>
          </div>
          {customDate && (
            <div className="px-4 mt-2">
              <input
                type="date"
                value={date}
                min={cycle?.start_date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl text-sm outline-none"
                style={{ background: "#F0EEE8", color: "#111111" }}
              />
            </div>
          )}

          <div className="px-4 mt-3">
            <input
              type="text"
              placeholder="뭘 먹었어요? (선택사항)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={30}
              className="w-full h-11 px-4 rounded-xl text-sm outline-none"
              style={{ background: "#F0EEE8", color: "#111111" }}
            />
          </div>

          <NumberPad value={amount} onChange={setAmount} />

          <div className="px-4 pb-6">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-[54px] rounded-xl text-base font-bold text-white"
              style={{ background: canSubmit ? "#111111" : "#BBBBBB" }}
            >
              {saving ? "저장 중..." : "먹기"}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
