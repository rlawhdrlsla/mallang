"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDailySummaries, useCycleSummary } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { formatMarshmallow, today, formatDateShort, getDayOfWeek } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function HistoryContent() {
  const expenses = useAppStore((s) => s.expenses);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const cycle = useAppStore((s) => s.cycle);
  const isLoading = useAppStore((s) => s.isLoading);

  const summaries = useDailySummaries();
  const { totalSpent, totalSaved, savedDays, elapsedDays } = useCycleSummary();

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text3)", fontSize: 14 }}>불러오는 중...</span>
      </div>
    );
  }

  const todayStr = today();
  const pastSummaries = [...summaries.filter((s) => s.date <= todayStr)].reverse();

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", pendingDeleteId);
    removeExpense(pendingDeleteId);
    setPendingDeleteId(null);
  }

  const savedPct = elapsedDays > 0 ? Math.round((savedDays / elapsedDays) * 100) : 0;

  return (
    <div className="page-fade" style={{ background: "var(--bg)", minHeight: "100vh", paddingBottom: 100 }}>

      {/* 헤더 */}
      <div style={{ padding: "52px 20px 20px" }}>
        <p style={{ color: "var(--text)", fontWeight: 900, fontSize: 26 }}>기록</p>
        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>마쉬멜로 먹은 기록</p>
      </div>

      {/* 이번 봉지 요약 */}
      {cycle && elapsedDays > 0 && (
        <div style={{ margin: "0 20px 20px" }}>
          <div style={{
            background: "var(--card)", borderRadius: 20, padding: "20px",
            boxShadow: "0 2px 12px var(--shadow)",
          }}>
            <p style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>이번 봉지 요약</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <StatBox label="먹은 마쉬멜로" value={formatMarshmallow(totalSpent)} accent="var(--pink)" />
              <StatBox label="구운 마쉬멜로" value={formatMarshmallow(totalSaved)} accent="var(--green)" />
              <StatBox label="참은 날" value={`${savedDays}/${elapsedDays}일`} accent="var(--burg)" />
            </div>
            {/* 참은 날 비율 바 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text2)", fontSize: 12 }}>참기 성공률</span>
                <span style={{ color: "var(--burg)", fontSize: 12, fontWeight: 700 }}>{savedPct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--burg-light)" }}>
                <div style={{
                  height: 6, borderRadius: 99,
                  width: `${savedPct}%`,
                  background: "var(--burg)",
                  transition: "width 400ms ease",
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 날짜별 기록 */}
      {pastSummaries.length === 0 ? (
        <div style={{ margin: "0 20px", textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>☁️</div>
          <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 기록이 없어요</p>
        </div>
      ) : (
        <div style={{ margin: "0 20px" }}>
          <p style={{ color: "var(--text2)", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>날짜별 기록</p>
          <div style={{ background: "var(--card)", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px var(--shadow)" }}>
            {pastSummaries.map((s, i) => {
              const dayExpenses = expenses.filter((e) => e.date === s.date);
              const isExpanded = expandedDate === s.date;
              const isLast = i === pastSummaries.length - 1;

              return (
                <div key={s.date}>
                  <div
                    onClick={() => dayExpenses.length > 0 && setExpandedDate(isExpanded ? null : s.date)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px",
                      cursor: dayExpenses.length > 0 ? "pointer" : "default",
                      borderBottom: isLast && !isExpanded ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {s.locked ? (
                        <span style={{ fontSize: 16 }}>🪢</span>
                      ) : s.saved >= 0 ? (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--pink)", flexShrink: 0 }} />
                      )}
                      <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>
                        {formatDateShort(s.date)} ({getDayOfWeek(s.date)})
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {s.locked ? (
                        <span style={{ color: "var(--text2)", fontSize: 12 }}>봉지 묶은 날</span>
                      ) : s.spent > 0 ? (
                        <span style={{ color: "var(--pink)", fontSize: 13, fontWeight: 700 }}>
                          -{formatMarshmallow(s.spent)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 700 }}>참았어요 ✓</span>
                      )}
                      {dayExpenses.length > 0 && (
                        <span style={{ color: "var(--text3)", fontSize: 11 }}>{isExpanded ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </div>

                  {isExpanded && dayExpenses.length > 0 && (
                    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--border)", background: "var(--bg)" }}>
                      {dayExpenses.map((e) => (
                        <div
                          key={e.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 18px 10px 36px",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <span style={{ color: "var(--text2)", fontSize: 13 }}>{e.note || "마쉬멜로"}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>
                              {formatMarshmallow(e.amount)}
                            </span>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); setPendingDeleteId(e.id); }}
                              style={{ color: "var(--text3)", fontSize: 18, background: "none", border: "none", padding: "0 2px", lineHeight: 1 }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: accent, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{value}</p>
      <p style={{ color: "var(--text2)", fontSize: 11 }}>{label}</p>
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
