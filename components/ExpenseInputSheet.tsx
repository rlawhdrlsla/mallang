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

function calcUnit(budget: number): number {
  if (budget <= 0) return 1000;
  const steps = [100, 200, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000, 100000];
  for (const step of steps) {
    const count = Math.floor(budget / step);
    if (count >= 5 && count <= 10) return step;
  }
  return Math.max(1, Math.ceil(budget / 7));
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

  const todayBudget = todaySummary?.budget ?? 0;
  const todaySpent = todaySummary?.spent ?? 0;
  const todayRemaining = Math.max(0, todayBudget - todaySpent);

  const unit = calcUnit(todayBudget);
  const totalIcons = Math.max(1, Math.min(Math.floor(todayBudget / unit), 10));
  const spentIcons = Math.min(Math.ceil(todaySpent / unit), totalIcons);
  const remainingIcons = totalIcons - spentIcons;

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
      title={step === "resist" ? "잠깐만요! 🍥" : "마쉬멜로 먹기"}
    >
      {step === "resist" ? (
        <div className="px-4 pb-8 pt-2">
          {/* 남은 마시멜로 이모지 */}
          <div
            className="rounded-2xl p-5 text-center mb-5"
            style={{ background: "#F8F7F4" }}
          >
            <p className="text-xs mb-4" style={{ color: "#6B6B6B" }}>
              지금 남은 마쉬멜로
            </p>
            {/* 이모지 그리드 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 6,
                marginBottom: 14,
                minHeight: 40,
              }}
            >
              {remainingIcons > 0 ? (
                Array.from({ length: remainingIcons }).map((_, i) => (
                  <span key={`r-${i}`} style={{ fontSize: 32, lineHeight: 1 }}>🍥</span>
                ))
              ) : (
                <span style={{ fontSize: 32 }}>😮‍💨</span>
              )}
              {spentIcons > 0 &&
                Array.from({ length: spentIcons }).map((_, i) => (
                  <span key={`s-${i}`} style={{ fontSize: 32, lineHeight: 1, opacity: 0.15, filter: "grayscale(1)" }}>🍥</span>
                ))
              }
            </div>

            <p className="text-xl font-extrabold" style={{ color: todayRemaining > 0 ? "#111111" : "#DC2626" }}>
              {formatMarshmallow(todayRemaining)}
            </p>
            {todayRemaining > 0 ? (
              <p className="text-xs mt-1" style={{ color: "#059669" }}>
                오늘 여기까지 남았어요 — 다 참으면 내일 더 많아져요 🔥
              </p>
            ) : (
              <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                오늘 예산을 다 썼어요
              </p>
            )}
          </div>

          <button
            onClick={handleClose}
            className="w-full h-[54px] rounded-xl text-base font-bold text-white mb-3"
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
