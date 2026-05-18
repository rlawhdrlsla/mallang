"use client";

import { useState } from "react";
import { BottomSheet } from "./ui/BottomSheet";
import { NumberPad } from "./ui/NumberPad";
import { formatMarshmallow, today, yesterday } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";

interface ExpenseInputSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ExpenseInputSheet({ open, onClose }: ExpenseInputSheetProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => today());
  const [customDate, setCustomDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const cycle = useAppStore((s) => s.cycle);
  const addExpense = useAppStore((s) => s.addExpense);

  function handleClose() {
    setAmount("");
    setNote("");
    setDate(today());
    setCustomDate(false);
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
    <BottomSheet open={open} onClose={handleClose} title="마쉬멜로 먹기 🍥">
      <div className="px-4 pt-2 pb-2">
        <div
          className="text-[44px] font-extrabold text-right"
          style={{ color: amount ? "#111111" : "#BBBBBB" }}
        >
          {amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0"}
          <span style={{ fontSize: 20, color: amount ? "#888888" : "#BBBBBB", marginLeft: 4 }}>개</span>
        </div>
        {amount && (
          <p className="text-right text-xs" style={{ color: "#AAAAAA", marginTop: -4, marginBottom: 4 }}>
            {formatMarshmallow(parseInt(amount, 10))}
          </p>
        )}
      </div>

      {/* 날짜 선택 */}
      <div className="px-4 flex gap-2">
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
          직접
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
    </BottomSheet>
  );
}
