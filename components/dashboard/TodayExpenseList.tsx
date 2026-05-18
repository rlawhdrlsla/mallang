"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { formatMarshmallow, today } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function TodayExpenseList() {
  const expenses = useAppStore((s) => s.expenses);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const todayStr = today();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);

  async function confirmDelete() {
    if (!pendingId) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", pendingId);
    removeExpense(pendingId);
    setPendingId(null);
  }

  if (todayExpenses.length === 0) return null;

  return (
    <>
      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: "#191919" }}>
          오늘 먹은 마쉬멜로
        </p>
        <div className="space-y-1">
          {todayExpenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between py-2.5 border-t"
              style={{ borderColor: "#E8E6DF" }}
            >
              <span className="text-sm" style={{ color: "#888888" }}>
                {e.note || "마쉬멜로"}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "#191919" }}>
                  {formatMarshmallow(e.amount)}
                </span>
                <button
                  onClick={() => setPendingId(e.id)}
                  className="text-lg"
                  style={{ color: "#BBBBBB" }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ConfirmSheet
        open={!!pendingId}
        message="이 기록을 지울까요?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
