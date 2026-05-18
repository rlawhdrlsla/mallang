"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDailySummaries, useWishlistProgress, useRemainingBudget, useCycleSummary } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { NumberPad } from "@/components/ui/NumberPad";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { BagShareCard } from "@/components/BagShareCard";
import { formatMarshmallow, today, formatDateShort, getDayOfWeek } from "@/lib/utils";
import { WishlistItem, DailySummary, Expense } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const MAX_GOAL_BAGS = 3;
const PINK = "#E06090";
const PINK_LIGHT = "#FCE8F0";
const CREAM = "#F8F7F4";

function BakingContent() {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const addWishlistItem = useAppStore((s) => s.addWishlistItem);
  const updateWishlistItem = useAppStore((s) => s.updateWishlistItem);
  const removeWishlistItem = useAppStore((s) => s.removeWishlistItem);
  const addExpense = useAppStore((s) => s.addExpense);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const cycle = useAppStore((s) => s.cycle);
  const expenses = useAppStore((s) => s.expenses);
  const isLoading = useAppStore((s) => s.isLoading);

  const progressList = useWishlistProgress();
  const { remainingBalance, remainingDays } = useRemainingBudget();
  const { totalSaved } = useCycleSummary();
  const summaries = useDailySummaries();

  // Add bag state
  const [showAdd, setShowAdd] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [dailyAutoSave, setDailyAutoSave] = useState(0);
  const [initialCapital, setInitialCapital] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail/action state
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [completingItem, setCompletingItem] = useState<WishlistItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const [shareCard, setShareCard] = useState<{ name: string; price: number; saved: number } | null>(null);

  // History expand state
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [pendingExpenseDeleteId, setPendingExpenseDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#BBBBBB", fontSize: 14 }}>불러오는 중...</span>
      </div>
    );
  }

  const todayStr = today();
  const pastSummaries = [...summaries.filter((s) => s.date <= todayStr)].reverse();
  const dailyBudget = remainingDays > 0 ? Math.floor(remainingBalance / remainingDays) : 0;
  const sliderMax = Math.max(dailyBudget, selectedItem?.daily_auto_save ?? 0, 100000);
  const isAtLimit = wishlistItems.length >= MAX_GOAL_BAGS;

  async function handleFetchUrl() {
    if (!urlInput) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(urlInput)}`);
      const data = await res.json();
      if (data.title && !itemName) setItemName(data.title.slice(0, 30));
      if (data.price && !itemPrice) setItemPrice(String(data.price));
      if (data.image) setItemImageUrl(data.image);
    } catch { /* ignore */ }
    setFetching(false);
  }

  async function handleAddItem() {
    if (!itemName || !itemPrice) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({
        user_id: user.id,
        name: itemName,
        price: parseInt(itemPrice, 10),
        image_url: itemImageUrl || null,
        current_amount: initialCapital,
        daily_auto_save: dailyAutoSave,
      })
      .select().single();

    if (!error && data) {
      addWishlistItem(data);
      // 초기 자본이 있으면 생활비 봉지에서 지출 기록
      if (initialCapital > 0 && cycle) {
        const { data: expense } = await supabase
          .from("expenses")
          .insert({
            cycle_id: cycle.id,
            user_id: user.id,
            date: today(),
            amount: initialCapital,
            category: "etc",
            note: `${itemName} 봉지 시작 자본`,
          })
          .select().single();
        if (expense) addExpense(expense);
      }
    }
    setSaving(false);
    setItemName(""); setItemPrice(""); setItemImageUrl(""); setUrlInput(""); setDailyAutoSave(0); setInitialCapital(0);
    setShowAdd(false);
  }

  async function handleUpdateAutoSave(item: WishlistItem, value: number) {
    const supabase = createClient();
    const { data } = await supabase
      .from("wishlist_items")
      .update({ daily_auto_save: value })
      .eq("id", item.id)
      .select().single();
    if (data) updateWishlistItem(data);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const supabase = createClient();
    await supabase.from("wishlist_items").delete().eq("id", pendingDeleteId);
    removeWishlistItem(pendingDeleteId);
    setPendingDeleteId(null);
    setSelectedItem(null);
  }

  async function handleTransfer() {
    if (!selectedItem || !transferAmount || !cycle) return;
    const amount = parseInt(transferAmount, 10);
    if (amount <= 0) return;
    setTransferring(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setTransferring(false); return; }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        cycle_id: cycle.id,
        user_id: user.id,
        date: today(),
        amount,
        category: "etc",
        note: `${selectedItem.name} 봉지로 이월`,
      })
      .select().single();

    if (!expenseError && expense) {
      addExpense(expense);
      const newAmount = Math.min(selectedItem.current_amount + amount, selectedItem.price);
      const { data: updated } = await supabase
        .from("wishlist_items")
        .update({ current_amount: newAmount })
        .eq("id", selectedItem.id)
        .select().single();
      if (updated) {
        updateWishlistItem(updated);
        setSelectedItem(updated);
      }
    }

    setTransferring(false);
    setShowTransfer(false);
    setTransferAmount("");
  }

  async function handleComplete() {
    if (!completingItem || !cycle) return;
    setCompleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCompleting(false); return; }

    const shortfall = Math.max(0, completingItem.price - completingItem.current_amount);
    if (shortfall > 0) {
      const { data: expense } = await supabase
        .from("expenses")
        .insert({
          cycle_id: cycle.id,
          user_id: user.id,
          date: today(),
          amount: shortfall,
          category: "shopping",
          note: completingItem.name,
        })
        .select().single();
      if (expense) addExpense(expense);
    }

    const savedAmount = completingItem.current_amount;
    const name = completingItem.name;
    const price = completingItem.price;
    await supabase.from("wishlist_items").delete().eq("id", completingItem.id);
    removeWishlistItem(completingItem.id);
    setCompleting(false);
    setCompletingItem(null);
    setSelectedItem(null);
    setShareCard({ name, price, saved: savedAmount });
  }

  async function confirmExpenseDelete() {
    if (!pendingExpenseDeleteId) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", pendingExpenseDeleteId);
    removeExpense(pendingExpenseDeleteId);
    setPendingExpenseDeleteId(null);
  }

  const currentProgress = selectedItem
    ? progressList.find((p) => p.item.id === selectedItem.id)
    : null;

  return (
    <div className="page-fade" style={{ background: CREAM, minHeight: "100vh", paddingBottom: 100 }}>

      {/* 헤더 */}
      <div style={{ padding: "52px 20px 24px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "#111111", fontWeight: 900, fontSize: 26 }}>Baking</p>
          <p style={{ color: "#888888", fontSize: 13, marginTop: 2 }}>굽는 중인 마쉬멜로 봉지</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={isAtLimit}
          style={{
            background: isAtLimit ? "#E8E6DF" : "#111111",
            color: isAtLimit ? "#BBBBBB" : "#FFFFFF",
            borderRadius: 99, padding: "9px 18px",
            fontSize: 13, fontWeight: 700, border: "none",
          }}
        >
          {isAtLimit ? "최대 3개" : "+ 봉지 추가"}
        </button>
      </div>

      {/* 이번 봉지 구운 마쉬멜로 요약 */}
      {totalSaved > 0 && (
        <div style={{
          margin: "0 20px 20px", background: "#111111",
          borderRadius: 20, padding: "18px 22px",
        }}>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 4 }}>이번 봉지에서 구운 마쉬멜로</p>
          <p style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 28, letterSpacing: "-0.5px" }}>
            {formatMarshmallow(totalSaved)}
          </p>
        </div>
      )}

      {/* 목표 봉지 목록 */}
      <div style={{ margin: "0 20px 32px" }}>
        {wishlistItems.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF", borderRadius: 20, padding: "36px 20px",
              textAlign: "center", border: "1.5px dashed #E8E6DF",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎁</div>
            <p style={{ color: "#BBBBBB", fontSize: 14 }}>갖고 싶은 걸 봉지에 담아보세요</p>
            <p style={{ color: "#DDDDDD", fontSize: 12, marginTop: 4 }}>최대 3개까지</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {progressList.map(({ item, daysNeeded, alreadyAchievable }) => (
              <GoalBagCard
                key={item.id}
                item={item}
                daysNeeded={daysNeeded}
                alreadyAchievable={alreadyAchievable}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 마쉬멜로 기록 */}
      {pastSummaries.length > 0 && (
        <div style={{ margin: "0 20px" }}>
          <p style={{ color: "#888888", fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            먹은 기록
          </p>
          <div style={{ background: "#FFFFFF", borderRadius: 20, overflow: "hidden" }}>
            {pastSummaries.map((s, i) => {
              const dayExpenses = expenses.filter((e) => e.date === s.date);
              const isExpanded = expandedDate === s.date;
              const isLast = i === pastSummaries.length - 1;
              return (
                <div key={s.date}>
                  <div
                    onClick={() => setExpandedDate(isExpanded ? null : s.date)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px", cursor: dayExpenses.length > 0 ? "pointer" : "default",
                      borderBottom: isLast && !isExpanded ? "none" : "1px solid #F0EEE8",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {s.locked ? (
                        <span style={{ fontSize: 18 }}>🪢</span>
                      ) : s.saved >= 0 ? (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }} />
                      ) : (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />
                      )}
                      <span style={{ color: "#111111", fontSize: 14, fontWeight: 600 }}>
                        {formatDateShort(s.date)} ({getDayOfWeek(s.date)})
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {s.locked ? (
                        <span style={{ color: "#888888", fontSize: 12 }}>봉지 묶은 날</span>
                      ) : s.spent > 0 ? (
                        <span style={{ color: PINK, fontSize: 13, fontWeight: 700 }}>
                          -{formatMarshmallow(s.spent)}
                        </span>
                      ) : (
                        <span style={{ color: "#059669", fontSize: 13, fontWeight: 700 }}>참았어요 ✓</span>
                      )}
                      {dayExpenses.length > 0 && (
                        <span style={{ color: "#CCCCCC", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded && dayExpenses.length > 0 && (
                    <div style={{ borderBottom: isLast ? "none" : "1px solid #F0EEE8" }}>
                      {dayExpenses.map((e) => (
                        <div
                          key={e.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 18px 10px 36px",
                            borderTop: "1px solid #F8F7F4",
                          }}
                        >
                          <span style={{ color: "#6B6B6B", fontSize: 13 }}>{e.note || "마쉬멜로"}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#111111", fontSize: 13, fontWeight: 600 }}>
                              {formatMarshmallow(e.amount)}
                            </span>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); setPendingExpenseDeleteId(e.id); }}
                              style={{ color: "#CCCCCC", fontSize: 16, background: "none", border: "none", padding: "0 2px" }}
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

      {/* ──── 목표 봉지 상세 시트 ──── */}
      <BottomSheet open={!!selectedItem} onClose={() => setSelectedItem(null)} title="">
        {selectedItem && (
          <div style={{ paddingBottom: 32 }}>
            {/* 이미지 */}
            {selectedItem.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedItem.image_url}
                alt={selectedItem.name}
                style={{ width: "100%", height: 180, objectFit: "cover" }}
              />
            ) : (
              <div style={{ height: 140, background: "linear-gradient(135deg, #F0EEE8, #E8E6DF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>
                🎁
              </div>
            )}

            <div style={{ padding: "20px 20px 0" }}>
              {/* 이름 + 삭제 */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ color: "#111111", fontWeight: 800, fontSize: 20, flex: 1 }}>{selectedItem.name}</p>
                <button
                  onClick={() => { setPendingDeleteId(selectedItem.id); }}
                  style={{ color: "#BBBBBB", fontSize: 13, background: "none", border: "none", marginLeft: 12, flexShrink: 0 }}
                >
                  삭제
                </button>
              </div>

              {/* 상태 뱃지 */}
              {currentProgress && (
                <span style={{
                  display: "inline-block", borderRadius: 99, padding: "3px 10px",
                  fontSize: 12, fontWeight: 700, marginBottom: 18,
                  background: currentProgress.alreadyAchievable ? "#ECFDF5" : PINK_LIGHT,
                  color: currentProgress.alreadyAchievable ? "#059669" : PINK,
                }}>
                  {currentProgress.alreadyAchievable
                    ? "🎉 지금 바로 구울 수 있어요!"
                    : currentProgress.daysNeeded > 0
                    ? `⏰ ${currentProgress.daysNeeded}일 더 참으면`
                    : "적립 중"}
                </span>
              )}

              {/* 진행률 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#111111", fontWeight: 900, fontSize: 22 }}>
                    {formatMarshmallow(selectedItem.current_amount)}
                  </span>
                  <span style={{ color: "#888888", fontSize: 13, alignSelf: "flex-end" }}>
                    / {formatMarshmallow(selectedItem.price)}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "#F0EEE8" }}>
                  <div style={{
                    height: 8, borderRadius: 99,
                    width: `${Math.min(Math.round((selectedItem.current_amount / selectedItem.price) * 100), 100)}%`,
                    background: currentProgress?.alreadyAchievable ? "#059669" : `linear-gradient(90deg, ${PINK}, #F0A0BB)`,
                    transition: "width 400ms ease",
                  }} />
                </div>
                <p style={{ color: "#888888", fontSize: 12, marginTop: 6, textAlign: "right" }}>
                  {Math.round((selectedItem.current_amount / selectedItem.price) * 100)}%
                </p>
              </div>

              {/* 하루 자동 적립 슬라이더 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ color: "#111111", fontWeight: 700, fontSize: 14 }}>하루 자동 적립</p>
                  <span style={{
                    color: selectedItem.daily_auto_save > 0 ? PINK : "#BBBBBB",
                    fontWeight: 800, fontSize: 15,
                  }}>
                    {selectedItem.daily_auto_save > 0 ? formatMarshmallow(selectedItem.daily_auto_save) : "없음"}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={Math.max(1000, Math.floor(sliderMax / 100))}
                  value={selectedItem.daily_auto_save}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    updateWishlistItem({ ...selectedItem, daily_auto_save: val });
                    setSelectedItem({ ...selectedItem, daily_auto_save: val });
                  }}
                  onMouseUp={(e) => handleUpdateAutoSave(selectedItem, parseInt((e.target as HTMLInputElement).value, 10))}
                  onTouchEnd={(e) => handleUpdateAutoSave(selectedItem, parseInt((e.target as HTMLInputElement).value, 10))}
                  style={{ width: "100%", accentColor: PINK }}
                />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#CCCCCC", fontSize: 11 }}>없음</span>
                  <span style={{ color: "#CCCCCC", fontSize: 11 }}>{formatMarshmallow(sliderMax)}/일</span>
                </div>
              </div>

              {/* 버튼 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => setShowTransfer(true)}
                  style={{
                    width: "100%", height: 52, borderRadius: 16, fontSize: 15, fontWeight: 700,
                    background: "#111111", color: "#FFFFFF", border: "none",
                  }}
                >
                  생활비 봉지에서 더 가져오기
                </button>
                {(currentProgress?.alreadyAchievable || remainingBalance >= (selectedItem.price - selectedItem.current_amount)) && (
                  <button
                    onClick={() => setCompletingItem(selectedItem)}
                    style={{
                      width: "100%", height: 52, borderRadius: 16, fontSize: 15, fontWeight: 700,
                      background: "#059669", color: "#FFFFFF", border: "none",
                    }}
                  >
                    봉지 완성! 🎉
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ──── 이월 시트 ──── */}
      <BottomSheet
        open={showTransfer}
        onClose={() => { setShowTransfer(false); setTransferAmount(""); }}
        title={`${selectedItem?.name ?? ""} 봉지로 이월`}
      >
        {selectedItem && (
          <div>
            <div style={{ padding: "16px 20px 8px" }}>
              <p style={{ color: "#888888", fontSize: 13, marginBottom: 12 }}>
                생활비 봉지에서 이 봉지로 마쉬멜로를 보내요
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 12, color: "#BBBBBB" }}>
                <span>현재 적립: {formatMarshmallow(selectedItem.current_amount)}</span>
                <span>목표: {formatMarshmallow(selectedItem.price)}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, textAlign: "right", color: transferAmount ? "#111111" : "#BBBBBB" }}>
                {transferAmount ? formatMarshmallow(parseInt(transferAmount, 10)) : "0개"}
              </div>
            </div>
            <NumberPad value={transferAmount} onChange={setTransferAmount} />
            <div style={{ padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
              {parseInt(transferAmount || "0") > remainingBalance && (
                <p style={{ color: "#DC2626", fontSize: 12, textAlign: "center" }}>
                  봉지 잔량({formatMarshmallow(remainingBalance)})보다 많아요
                </p>
              )}
              <button
                onClick={handleTransfer}
                disabled={!transferAmount || parseInt(transferAmount) > remainingBalance || transferring}
                style={{
                  width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: transferAmount && parseInt(transferAmount) <= remainingBalance && !transferring ? "#111111" : "#BBBBBB",
                  color: "#FFFFFF", border: "none",
                }}
              >
                {transferring ? "이월 중..." : "이월하기"}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ──── 봉지 완성 확인 ──── */}
      <BottomSheet open={!!completingItem} onClose={() => setCompletingItem(null)} title="봉지 완성! 🎉">
        {completingItem && (
          <div style={{ padding: "8px 20px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#111111" }}>{completingItem.name}</p>
              <p style={{ color: "#6B6B6B", fontSize: 14, marginTop: 6 }}>
                {formatMarshmallow(completingItem.current_amount)} 모았어요
              </p>
              {completingItem.current_amount < completingItem.price && (
                <p style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>
                  {formatMarshmallow(completingItem.price - completingItem.current_amount)} 부족 — 봉지에서 추가로 빠져요
                </p>
              )}
            </div>
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: completing ? "#BBBBBB" : "#111111", color: "#FFFFFF", border: "none" }}
            >
              {completing ? "처리 중..." : "봉지 완성!"}
            </button>
            <button
              onClick={() => setCompletingItem(null)}
              style={{ width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "#F0EEE8", color: "#111111", border: "none" }}
            >
              계속 굽기
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ──── 봉지 추가 시트 ──── */}
      <BottomSheet open={showAdd} onClose={() => { setShowAdd(false); setItemName(""); setItemPrice(""); setItemImageUrl(""); setUrlInput(""); setDailyAutoSave(0); }} title="새 마쉬멜로 봉지">
        <div style={{ padding: "8px 20px 4px" }}>
          <p style={{ color: "#888888", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>상품 링크로 자동 입력 (선택)</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="url"
              placeholder="상품 URL 붙여넣기"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{ flex: 1, height: 44, padding: "0 14px", borderRadius: 12, fontSize: 13, background: "#F0EEE8", border: "none", outline: "none", color: "#111111" }}
            />
            <button
              onClick={handleFetchUrl}
              disabled={!urlInput || fetching}
              style={{
                height: 44, padding: "0 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none",
                background: urlInput && !fetching ? "#111111" : "#F0EEE8",
                color: urlInput && !fetching ? "#FFFFFF" : "#BBBBBB",
                whiteSpace: "nowrap",
              }}
            >
              {fetching ? "..." : "가져오기"}
            </button>
          </div>
          {itemImageUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemImageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid #E8E6DF" }} />
              <span style={{ color: "#059669", fontSize: 12 }}>이미지 가져오기 완료</span>
            </div>
          )}
          <input
            type="text"
            placeholder="뭘 굽고 싶어요?"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            maxLength={30}
            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "#F0EEE8", border: "none", outline: "none", color: "#111111", marginBottom: 16 }}
          />
          <p style={{ color: "#888888", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>목표 금액</p>
          <div style={{ fontSize: 30, fontWeight: 900, textAlign: "right", color: itemPrice ? "#111111" : "#BBBBBB", marginBottom: 2 }}>
            {itemPrice ? formatMarshmallow(parseInt(itemPrice, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={itemPrice} onChange={setItemPrice} />
        <div style={{ padding: "8px 20px 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ color: "#111111", fontWeight: 700, fontSize: 14 }}>하루 자동 적립 (선택)</p>
            <span style={{ color: dailyAutoSave > 0 ? PINK : "#BBBBBB", fontWeight: 700, fontSize: 14 }}>
              {dailyAutoSave > 0 ? formatMarshmallow(dailyAutoSave) : "없음"}
            </span>
          </div>
          <p style={{ color: "#BBBBBB", fontSize: 12, marginBottom: 8 }}>생활비에서 매일 이만큼 자동으로 보내요</p>
          <input
            type="range"
            min={0}
            max={Math.max(dailyBudget, 100000)}
            step={Math.max(1000, Math.floor(Math.max(dailyBudget, 100000) / 100))}
            value={dailyAutoSave}
            onChange={(e) => setDailyAutoSave(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: PINK, marginBottom: 4 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ color: "#CCCCCC", fontSize: 11 }}>없음</span>
            <span style={{ color: "#CCCCCC", fontSize: 11 }}>{formatMarshmallow(Math.max(dailyBudget, 100000))}/일</span>
          </div>

          {/* 생활비 봉지에서 시작 자본 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ color: "#111111", fontWeight: 700, fontSize: 14 }}>시작 자본 (선택)</p>
            <span style={{ color: initialCapital > 0 ? "#059669" : "#BBBBBB", fontWeight: 700, fontSize: 14 }}>
              {initialCapital > 0 ? formatMarshmallow(initialCapital) : "없음"}
            </span>
          </div>
          <p style={{ color: "#BBBBBB", fontSize: 12, marginBottom: 8 }}>생활비 봉지에서 즉시 가져올 금액</p>
          <input
            type="range"
            min={0}
            max={remainingBalance}
            step={Math.max(1000, Math.floor(remainingBalance / 100))}
            value={initialCapital}
            onChange={(e) => setInitialCapital(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "#059669", marginBottom: 4 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#CCCCCC", fontSize: 11 }}>없음</span>
            <span style={{ color: "#CCCCCC", fontSize: 11 }}>잔액 {formatMarshmallow(remainingBalance)}</span>
          </div>
        </div>
        <div style={{ padding: "12px 20px 32px" }}>
          <button
            onClick={handleAddItem}
            disabled={!itemName || !itemPrice || saving}
            style={{
              width: "100%", height: 54, borderRadius: 14, fontSize: 15, fontWeight: 700,
              background: itemName && itemPrice ? "#111111" : "#BBBBBB",
              color: "#FFFFFF", border: "none",
            }}
          >
            {saving ? "저장 중..." : "굽기 시작!"}
          </button>
        </div>
      </BottomSheet>

      {/* 삭제 확인 */}
      <ConfirmSheet
        open={!!pendingDeleteId}
        message="이 마쉬멜로 봉지를 없앨까요?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
      <ConfirmSheet
        open={!!pendingExpenseDeleteId}
        message="이 마쉬멜로 기록을 삭제할까요?"
        onConfirm={confirmExpenseDelete}
        onCancel={() => setPendingExpenseDeleteId(null)}
      />

      {/* 봉지 완성 공유 카드 */}
      {shareCard && (
        <BagShareCard
          open={!!shareCard}
          onClose={() => setShareCard(null)}
          itemName={shareCard.name}
          targetPrice={shareCard.price}
          savedAmount={shareCard.saved}
        />
      )}

      <BottomNav />
    </div>
  );
}

function GoalBagCard({
  item, daysNeeded, alreadyAchievable, onClick,
}: {
  item: WishlistItem; daysNeeded: number; alreadyAchievable: boolean; onClick: () => void;
}) {
  const pct = Math.min(Math.round((item.current_amount / item.price) * 100), 100);

  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF",
        borderRadius: 20,
        overflow: "hidden",
        border: alreadyAchievable ? "1.5px solid #059669" : "1px solid #F0EEE8",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* 이미지 영역 */}
      <div style={{
        height: 130,
        background: item.image_url
          ? `url(${item.image_url}) center/cover`
          : "linear-gradient(135deg, #F0EEE8, #E8E6DF)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48,
        position: "relative",
      }}>
        {!item.image_url && "🎁"}
        {/* 뱃지 */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: alreadyAchievable ? "#059669" : "#111111",
          color: "#FFFFFF", borderRadius: 99, padding: "4px 10px",
          fontSize: 11, fontWeight: 700,
        }}>
          {alreadyAchievable ? "🎉 완성 가능" : daysNeeded > 0 ? `${daysNeeded}일 더` : "적립 중"}
        </div>
      </div>

      {/* 내용 */}
      <div style={{ padding: "14px 16px 16px" }}>
        <p style={{ color: "#111111", fontWeight: 700, fontSize: 15, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </p>

        {/* 진행 바 */}
        <div style={{ height: 6, borderRadius: 99, background: "#F0EEE8", marginBottom: 8 }}>
          <div style={{
            height: 6, borderRadius: 99, width: `${pct}%`,
            background: alreadyAchievable ? "#059669" : `linear-gradient(90deg, ${PINK}, #F0A0BB)`,
            transition: "width 400ms ease",
          }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#888888", fontSize: 12 }}>
            {formatMarshmallow(item.current_amount)} / {formatMarshmallow(item.price)}
          </span>
          <span style={{ color: alreadyAchievable ? "#059669" : PINK, fontSize: 13, fontWeight: 700 }}>
            {pct}%
          </span>
        </div>

        {item.daily_auto_save > 0 && (
          <p style={{ color: "#AAAAAA", fontSize: 11, marginTop: 6 }}>
            하루 {formatMarshmallow(item.daily_auto_save)}씩 자동 적립 중
          </p>
        )}
      </div>
    </div>
  );
}

export default function BakingPage() {
  return (
    <DataLoader>
      <BakingContent />
    </DataLoader>
  );
}
