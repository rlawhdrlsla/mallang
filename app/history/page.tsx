"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useDailySummaries, useCycleSummary } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { formatKRW, formatDateShort, getDayOfWeek, CATEGORY_LABELS, CATEGORY_COLORS, today } from "@/lib/utils";
import { DailySummary, Expense, Cycle } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type Tab = "calendar" | "list" | "past";

function HistoryContent() {
  const [tab, setTab] = useState<Tab>("calendar");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const expenses = useAppStore((s) => s.expenses);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const isLoading = useAppStore((s) => s.isLoading);
  const summaries = useDailySummaries();
  const { totalSpent, totalSaved } = useCycleSummary();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: "#BBBBBB" }}>불러오는 중...</div>
      </div>
    );
  }

  const todayStr = today();
  const pastSummaries = summaries.filter((s) => s.date <= todayStr);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", pendingDeleteId);
    removeExpense(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <div className="page-fade pb-[160px]">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold" style={{ color: "#191919" }}>내역</h1>
      </div>

      {/* 사이클 요약 */}
      <div className="px-5 mb-4">
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: "#191919" }}>이번 사이클 요약</p>
          <div className="flex justify-between">
            <div>
              <p className="text-xs" style={{ color: "#888888" }}>총 지출</p>
              <p className="text-base font-bold tabular-nums" style={{ color: "#191919" }}>
                ₩{formatKRW(totalSpent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "#888888" }}>총 절약</p>
              <p className="text-base font-bold tabular-nums" style={{ color: "#00B493" }}>
                ₩{formatKRW(totalSaved)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 카테고리 차트 */}
      <div className="px-5 mb-4">
        <CategoryChart expenses={expenses.filter((e) => e.date <= todayStr)} />
      </div>

      {/* 탭 */}
      <div className="flex gap-2 px-5 mb-4">
        {([["calendar", "캘린더"], ["list", "날짜별"], ["past", "지난 사이클"]] as [Tab, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className="flex-1 h-9 rounded-lg text-sm font-semibold"
            style={{
              background: tab === v ? "#191919" : "#F7F7F8",
              color: tab === v ? "#FFFFFF" : "#888888",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "calendar" && (
        <div className="px-5">
          <CalendarView
            summaries={pastSummaries}
            expenses={expenses.filter((e) => e.date <= todayStr)}
          />
        </div>
      )}
      {tab === "list" && (
        <div className="px-5 space-y-3">
          {[...pastSummaries].reverse().map((s) => (
            <DayCard
              key={s.date}
              summary={s}
              expenses={expenses.filter((e) => e.date === s.date)}
              onDeleteRequest={setPendingDeleteId}
            />
          ))}
        </div>
      )}
      {tab === "past" && (
        <div className="px-5">
          <PastCycles />
        </div>
      )}

      <ConfirmSheet
        open={!!pendingDeleteId}
        message="이 지출을 삭제할까요?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <BottomNav />
    </div>
  );
}

function CategoryChart({ expenses }: { expenses: Expense[] }) {
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const cats = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <p className="text-sm font-semibold mb-4" style={{ color: "#191919" }}>카테고리별 지출</p>
      <div className="space-y-3">
        {cats.map(([cat, amt]) => (
          <div key={cat}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: "#191919" }}>
                {CATEGORY_LABELS[cat]}
              </span>
              <span className="text-sm tabular-nums" style={{ color: "#888888" }}>
                ₩{formatKRW(amt)} · {Math.round(amt / total * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "#F0F0F0" }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${amt / total * 100}%`,
                  background: CATEGORY_COLORS[cat],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CalendarView({ summaries, expenses }: { summaries: DailySummary[]; expenses: Expense[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const byDate = Object.fromEntries(summaries.map((s) => [s.date, s]));

  if (summaries.length === 0) return (
    <p className="text-sm text-center py-8" style={{ color: "#BBBBBB" }}>아직 기록이 없어요</p>
  );

  const firstDate = summaries[0].date;
  const year = parseInt(firstDate.slice(0, 4));
  const month = parseInt(firstDate.slice(5, 7));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return d;
    }),
  ];

  const todayStr = today();
  const selectedSummary = selectedDate ? byDate[selectedDate] : null;
  const selectedExpenses = selectedDate ? expenses.filter((e) => e.date === selectedDate) : [];

  return (
    <Card>
      <p className="text-sm font-semibold mb-4" style={{ color: "#191919" }}>
        {year}년 {month}월
      </p>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-xs font-semibold" style={{ color: "#BBBBBB" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const s = byDate[date];
          const isToday = date === todayStr;
          const isSelected = date === selectedDate;
          const dot = s ? (s.saved >= 0 ? "#00B493" : "#FF3B30") : null;
          const isClickable = !!s;

          return (
            <div
              key={date}
              onClick={() => isClickable && setSelectedDate(isSelected ? null : date)}
              className="aspect-square flex flex-col items-center justify-center rounded-lg relative"
              style={{
                background: isSelected ? "#FF6B35" : isToday ? "#FFF0EB" : "transparent",
                cursor: isClickable ? "pointer" : "default",
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: isSelected ? "#FFFFFF" : isToday ? "#FF6B35" : "#191919" }}
              >
                {parseInt(date.slice(8))}
              </span>
              {dot && !isSelected && (
                <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: dot }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#00B493" }} />
          <span className="text-xs" style={{ color: "#888888" }}>절약</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#FF3B30" }} />
          <span className="text-xs" style={{ color: "#888888" }}>초과</span>
        </div>
      </div>

      {selectedDate && selectedSummary && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "#F0F0F0" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: "#191919" }}>
              {formatDateShort(selectedDate)} ({getDayOfWeek(selectedDate)})
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: selectedSummary.saved < 0 ? "#FFF0EF" : "#E6F9F5",
                color: selectedSummary.saved < 0 ? "#FF3B30" : "#00B493",
              }}
            >
              {selectedSummary.saved < 0
                ? `초과 ₩${formatKRW(Math.abs(selectedSummary.saved))}`
                : `절약 ₩${formatKRW(selectedSummary.saved)}`}
            </span>
          </div>
          {selectedExpenses.length === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: "#BBBBBB" }}>지출 없음</p>
          ) : (
            <div className="space-y-0">
              {selectedExpenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2 border-t"
                  style={{ borderColor: "#F0F0F0" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: CATEGORY_COLORS[e.category] + "22",
                        color: CATEGORY_COLORS[e.category],
                      }}
                    >
                      {CATEGORY_LABELS[e.category]}
                    </span>
                    {e.note && <span className="text-sm" style={{ color: "#888888" }}>{e.note}</span>}
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "#191919" }}>
                    ₩{formatKRW(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DayCard({
  summary, expenses, onDeleteRequest,
}: {
  summary: DailySummary; expenses: Expense[]; onDeleteRequest: (id: string) => void;
}) {
  const { date, budget, spent, saved } = summary;
  const isOver = saved < 0;

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: "#191919" }}>
          {formatDateShort(date)} ({getDayOfWeek(date)})
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: isOver ? "#FFF0EF" : "#E6F9F5",
            color: isOver ? "#FF3B30" : "#00B493",
          }}
        >
          {isOver ? "초과" : "절약"}
        </span>
      </div>
      <div className="flex gap-4 text-xs mb-2" style={{ color: "#888888" }}>
        <span>예산 ₩{formatKRW(budget)}</span>
        <span>지출 ₩{formatKRW(spent)}</span>
        <span style={{ color: isOver ? "#FF3B30" : "#00B493" }}>
          {isOver ? `초과 ₩${formatKRW(Math.abs(saved))}` : `절약 ₩${formatKRW(saved)}`}
        </span>
      </div>
      {expenses.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between py-2 border-t"
          style={{ borderColor: "#F0F0F0" }}
        >
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums" style={{ color: "#191919" }}>
              ₩{formatKRW(e.amount)}
            </span>
            <button onClick={() => onDeleteRequest(e.id)} style={{ color: "#BBBBBB" }}>×</button>
          </div>
        </div>
      ))}
    </Card>
  );
}

interface PastCycleData extends Cycle {
  totalSpent: number;
}

function PastCycles() {
  const [cycles, setCycles] = useState<PastCycleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: pastCycles } = await supabase
        .from("cycles")
        .select("*")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false });

      if (!pastCycles?.length) { setLoading(false); return; }

      const { data: expenses } = await supabase
        .from("expenses")
        .select("cycle_id, amount")
        .in("cycle_id", pastCycles.map((c) => c.id));

      const spentMap: Record<string, number> = {};
      for (const e of expenses ?? []) {
        spentMap[e.cycle_id] = (spentMap[e.cycle_id] ?? 0) + e.amount;
      }

      setCycles(pastCycles.map((c) => ({ ...c, totalSpent: spentMap[c.id] ?? 0 })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-center py-8" style={{ color: "#BBBBBB" }}>불러오는 중...</p>;
  }
  if (!cycles.length) {
    return <p className="text-sm text-center py-8" style={{ color: "#BBBBBB" }}>아직 종료된 사이클이 없어요</p>;
  }

  return (
    <div className="space-y-3">
      {cycles.map((c) => {
        const effective = c.total_balance - c.fixed_expenses + c.carried_over_amount;
        const saved = Math.max(0, effective - c.totalSpent);
        const isProfit = saved > 0;
        return (
          <Card key={c.id}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: "#191919" }}>
                {c.start_date} ~ {c.ended_at?.slice(0, 10)}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isProfit ? "#E6F9F5" : "#FFF0EF",
                  color: isProfit ? "#00B493" : "#FF3B30",
                }}
              >
                {isProfit ? `절약 ₩${formatKRW(saved)}` : `초과 ₩${formatKRW(Math.abs(effective - c.totalSpent))}`}
              </span>
            </div>
            <div className="space-y-1.5">
              <Row label="예산" value={`₩${formatKRW(c.total_balance)}`} />
              {c.fixed_expenses > 0 && <Row label="고정 지출" value={`₩${formatKRW(c.fixed_expenses)}`} />}
              {c.carried_over_amount > 0 && <Row label="이월 절약" value={`+₩${formatKRW(c.carried_over_amount)}`} valueColor="#00B493" />}
              <Row label="총 지출" value={`₩${formatKRW(c.totalSpent)}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Row({ label, value, valueColor = "#191919" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs" style={{ color: "#888888" }}>{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <DataLoader>
      <HistoryContent />
    </DataLoader>
  );
}
