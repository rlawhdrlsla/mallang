"use client";

import { useAppStore } from "@/store/app-store";
import { Card } from "@/components/ui/Card";
import { formatKRW, today, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function TodayExpenseList() {
  const { expenses, removeExpense } = useAppStore();
  const todayStr = today();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", id);
    removeExpense(id);
  }

  if (todayExpenses.length === 0) return null;

  return (
    <Card>
      <p className="text-sm font-semibold mb-3" style={{ color: "#191919" }}>
        오늘 지출
      </p>
      <div className="space-y-1">
        {todayExpenses.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between py-2.5 border-t"
            style={{ borderColor: "#F0F0F0" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: CATEGORY_COLORS[e.category] + "22",
                  color: CATEGORY_COLORS[e.category],
                }}
              >
                {CATEGORY_LABELS[e.category]}
              </span>
              {e.note && (
                <span className="text-sm" style={{ color: "#888888" }}>{e.note}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tabular-nums" style={{ color: "#191919" }}>
                ₩{formatKRW(e.amount)}
              </span>
              <button
                onClick={() => handleDelete(e.id)}
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
  );
}
