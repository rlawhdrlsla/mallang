"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useDailySummaries, useCycleSummary } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { formatMarshmallow, formatDateShort, getDayOfWeek, today } from "@/lib/utils";
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
        <h1 className="text-xl font-bold" style={{ color: "#111111" }}>내역</h1>
      </div>

      {/* 봉지 요약 */}
      <div className="px-5 mb-4">
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: "#111111" }}>이번 봉지 요약</p>
          <div className="flex justify-between">
            <div>
              <p className="text-xs" style={{ color: "#6B6B6B" }}>먹은 마쉬멜로</p>
              <p className="text-base font-bold tabular-nums" style={{ color: "#111111" }}>
                {formatMarshmallow(totalSpent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "#6B6B6B" }}>구운 마쉬멜로</p>
              <p className="text-base font-bold tabular-nums" style={{ color: "#059669" }}>
                {formatMarshmallow(totalSaved)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 px-5 mb-4">
        {([["calendar", "캘린더"], ["list", "날짜별"], ["past", "지난 봉지"]] as [Tab, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className="flex-1 h-9 rounded-lg text-sm font-semibold"
            style={{
              background: tab === v ? "#111111" : "#F0EEE8",
              color: tab === v ? "#FFFFFF" : "#6B6B6B",
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
        message="이 마쉬멜로 기록을 삭제할까요?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <BottomNav />
    </div>
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
      <p className="text-sm font-semibold mb-4" style={{ color: "#111111" }}>
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
          const isLocked = s?.locked;
          const dot = s && !isLocked ? (s.saved >= 0 ? "#059669" : "#DC2626") : null;
          const isClickable = !!s;

          return (
            <div
              key={date}
              onClick={() => isClickable && setSelectedDate(isSelected ? null : date)}
              className="aspect-square flex flex-col items-center justify-center rounded-lg relative"
              style={{
                background: isSelected ? "#111111" : isToday ? "#F0EEE8" : "transparent",
                cursor: isClickable ? "pointer" : "default",
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: isSelected ? "#FFFFFF" : "#111111" }}
              >
                {parseInt(date.slice(8))}
              </span>
              {isLocked && !isSelected ? (
                <div className="text-[8px] mt-0.5">🪢</div>
              ) : dot && !isSelected ? (
                <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: dot }} />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
          <span className="text-xs" style={{ color: "#6B6B6B" }}>구운 날</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} />
          <span className="text-xs" style={{ color: "#6B6B6B" }}>초과한 날</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">🪢</span>
          <span className="text-xs" style={{ color: "#6B6B6B" }}>봉지 묶은 날</span>
        </div>
      </div>

      {selectedDate && selectedSummary && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "#E8E6DF" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: "#111111" }}>
              {formatDateShort(selectedDate)} ({getDayOfWeek(selectedDate)})
            </span>
            {selectedSummary.locked ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#F0EEE8", color: "#6B6B6B" }}>
                🪢 봉지 묶은 날
              </span>
            ) : (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: selectedSummary.saved < 0 ? "#FEF2F2" : "#ECFDF5",
                  color: selectedSummary.saved < 0 ? "#DC2626" : "#059669",
                }}
              >
                {selectedSummary.saved < 0
                  ? `초과 ${formatMarshmallow(Math.abs(selectedSummary.saved))}`
                  : `+${formatMarshmallow(selectedSummary.saved)} 구움`}
              </span>
            )}
          </div>
          {selectedExpenses.length === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: "#BBBBBB" }}>먹은 마쉬멜로 없음</p>
          ) : (
            <div className="space-y-0">
              {selectedExpenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2 border-t"
                  style={{ borderColor: "#E8E6DF" }}
                >
                  {e.note ? (
                    <span className="text-sm" style={{ color: "#6B6B6B" }}>{e.note}</span>
                  ) : (
                    <span className="text-sm" style={{ color: "#BBBBBB" }}>마쉬멜로</span>
                  )}
                  <span className="text-sm font-bold tabular-nums" style={{ color: "#111111" }}>
                    {formatMarshmallow(e.amount)}
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
  const { date, budget, spent, saved, locked } = summary;
  const isOver = saved < 0;

  if (locked) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: "#111111" }}>
            {formatDateShort(date)} ({getDayOfWeek(date)})
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#F0EEE8", color: "#6B6B6B" }}>
            🪢 봉지 묶은 날
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: "#111111" }}>
          {formatDateShort(date)} ({getDayOfWeek(date)})
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: isOver ? "#FEF2F2" : "#ECFDF5",
            color: isOver ? "#DC2626" : "#059669",
          }}
        >
          {isOver ? "초과" : "구움"}
        </span>
      </div>
      <div className="flex gap-4 text-xs mb-2" style={{ color: "#6B6B6B" }}>
        <span>예산 {formatMarshmallow(budget)}</span>
        <span>먹음 {formatMarshmallow(spent)}</span>
        <span style={{ color: isOver ? "#DC2626" : "#059669" }}>
          {isOver ? `초과 ${formatMarshmallow(Math.abs(saved))}` : `+${formatMarshmallow(saved)} 구움`}
        </span>
      </div>
      {expenses.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between py-2 border-t"
          style={{ borderColor: "#E8E6DF" }}
        >
          {e.note ? (
            <span className="text-sm" style={{ color: "#6B6B6B" }}>{e.note}</span>
          ) : (
            <span className="text-sm" style={{ color: "#BBBBBB" }}>마쉬멜로</span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums" style={{ color: "#111111" }}>
              {formatMarshmallow(e.amount)}
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
    return <p className="text-sm text-center py-8" style={{ color: "#BBBBBB" }}>아직 완성된 봉지가 없어요</p>;
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
              <span className="text-sm font-semibold" style={{ color: "#111111" }}>
                {c.start_date} ~ {c.ended_at?.slice(0, 10)}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isProfit ? "#ECFDF5" : "#FEF2F2",
                  color: isProfit ? "#059669" : "#DC2626",
                }}
              >
                {isProfit ? `+${formatMarshmallow(saved)} 구움` : `초과 ${formatMarshmallow(Math.abs(effective - c.totalSpent))}`}
              </span>
            </div>
            <div className="space-y-1.5">
              <Row label="총 마쉬멜로" value={formatMarshmallow(c.total_balance)} />
              {c.fixed_expenses > 0 && <Row label="고정 지출" value={formatMarshmallow(c.fixed_expenses)} />}
              {c.carried_over_amount > 0 && <Row label="이월 마쉬멜로" value={`+${formatMarshmallow(c.carried_over_amount)}`} valueColor="#059669" />}
              <Row label="먹은 마쉬멜로" value={formatMarshmallow(c.totalSpent)} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Row({ label, value, valueColor = "#111111" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs" style={{ color: "#6B6B6B" }}>{label}</span>
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
