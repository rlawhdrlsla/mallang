"use client";

import { useState } from "react";
import { BottomSheet } from "./ui/BottomSheet";
import { NumberPad } from "./ui/NumberPad";
import { CategoryTabs } from "./ui/CategoryTabs";
import { Category } from "@/lib/types";
import { formatKRW, today, yesterday } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";

interface ExpenseInputSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ExpenseInputSheet({ open, onClose }: ExpenseInputSheetProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => today());
  const [customDate, setCustomDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const cycle = useAppStore((s) => s.cycle);
  const addExpense = useAppStore((s) => s.addExpense);

  function handleClose() {
    setAmount("");
    setCategory(null);
    setNote("");
    setDate(today());
    setCustomDate(false);
    onClose();
  }

  async function handleSubmit() {
    if (!amount || !category || !cycle) return;
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
        category,
        note,
      })
      .select()
      .single();

    if (!error && data) {
      addExpense(data);
    }
    setSaving(false);
    handleClose();
  }

  const canSubmit = !!amount && !!category && !saving;

  return (
    <BottomSheet open={open} onClose={handleClose} title="지출 추가">
      <div className="px-4 pt-4 pb-2">
        <div
          className="text-[40px] font-extrabold tabular-nums text-right"
          style={{ color: amount ? "#191919" : "#BBBBBB" }}
        >
          ₩ {amount ? formatKRW(parseInt(amount, 10)) : "0"}
        </div>
      </div>

      <CategoryTabs value={category} onChange={setCategory} />

      {/* 날짜 선택 */}
      <div className="px-4 mt-3 flex gap-2">
        {([["오늘", today()], ["어제", yesterday()]] as [string, string][]).map(([label, val]) => (
          <button
            key={label}
            onClick={() => { setDate(val); setCustomDate(false); }}
            className="h-9 px-4 rounded-lg text-sm font-semibold"
            style={{
              background: !customDate && date === val ? "#FF6B35" : "#F7F7F8",
              color: !customDate && date === val ? "#FFFFFF" : "#888888",
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setCustomDate(true)}
          className="h-9 px-4 rounded-lg text-sm font-semibold"
          style={{
            background: customDate ? "#FF6B35" : "#F7F7F8",
            color: customDate ? "#FFFFFF" : "#888888",
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
            style={{ background: "#F7F7F8", color: "#191919" }}
          />
        </div>
      )}

      <div className="px-4 mt-3">
        <input
          type="text"
          placeholder="메모 (선택사항)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={30}
          className="w-full h-11 px-4 rounded-xl text-sm outline-none"
          style={{
            background: "#F7F7F8",
            color: "#191919",
          }}
        />
      </div>

      <NumberPad value={amount} onChange={setAmount} />

      <div className="px-4 pb-6">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-[54px] rounded-xl text-base font-bold text-white transition-opacity"
          style={{
            background: canSubmit ? "#FF6B35" : "#BBBBBB",
          }}
        >
          {saving ? "저장 중..." : "완료"}
        </button>
      </div>
    </BottomSheet>
  );
}
