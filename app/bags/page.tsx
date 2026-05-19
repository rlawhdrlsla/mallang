"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useWishlistProgress, useRemainingBudget, useCycleSummary } from "@/lib/hooks";
import { DataLoader } from "@/components/DataLoader";
import { BottomNav } from "@/components/BottomNav";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { NumberPad } from "@/components/ui/NumberPad";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { BagShareCard } from "@/components/BagShareCard";
import { formatMarshmallow, today } from "@/lib/utils";
import { WishlistItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const BURG = "#5C3030";
const GREEN = "#4B7860";
const MAX_GOAL_BAGS = 3;

function BagsContent() {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const addWishlistItem = useAppStore((s) => s.addWishlistItem);
  const updateWishlistItem = useAppStore((s) => s.updateWishlistItem);
  const removeWishlistItem = useAppStore((s) => s.removeWishlistItem);
  const addExpense = useAppStore((s) => s.addExpense);
  const cycle = useAppStore((s) => s.cycle);
  const isLoading = useAppStore((s) => s.isLoading);

  const progressList = useWishlistProgress();
  const { remainingBalance, remainingDays } = useRemainingBudget();
  const { totalSaved } = useCycleSummary();

  // Add bag
  const [showAdd, setShowAdd] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [dailyAutoSave, setDailyAutoSave] = useState(0);
  const [initialCapital, setInitialCapital] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [completingItem, setCompletingItem] = useState<WishlistItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const [shareCard, setShareCard] = useState<{ name: string; price: number; saved: number } | null>(null);

  if (isLoading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text3)" }}>불러오는 중...</span>
      </div>
    );
  }

  const dailyBudget = remainingDays > 0 ? Math.floor(remainingBalance / remainingDays) : 0;
  const sliderMax = Math.max(dailyBudget, selectedItem?.daily_auto_save ?? 0, 50000);
  const isAtLimit = wishlistItems.length >= MAX_GOAL_BAGS;
  const currentProgress = selectedItem ? progressList.find((p) => p.item.id === selectedItem.id) : null;

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
      if (initialCapital > 0 && cycle) {
        const { data: expense } = await supabase
          .from("expenses")
          .insert({ cycle_id: cycle.id, user_id: user.id, date: today(), amount: initialCapital, category: "etc", note: `${itemName} 봉지 시작 자본` })
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
    const { data } = await supabase.from("wishlist_items").update({ daily_auto_save: value }).eq("id", item.id).select().single();
    if (data) { updateWishlistItem(data); setSelectedItem(data); }
  }

  async function handleEditSave() {
    if (!selectedItem || !editName || !editPrice) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("wishlist_items")
      .update({ name: editName, price: parseInt(editPrice, 10) })
      .eq("id", selectedItem.id)
      .select().single();
    if (data) { updateWishlistItem(data); setSelectedItem(data); }
    setEditMode(false);
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

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({ cycle_id: cycle.id, user_id: user.id, date: today(), amount, category: "etc", note: `${selectedItem.name} 봉지로 이월` })
      .select().single();

    if (!error && expense) {
      addExpense(expense);
      const newAmt = Math.min(selectedItem.current_amount + amount, selectedItem.price);
      const { data: updated } = await supabase.from("wishlist_items").update({ current_amount: newAmt }).eq("id", selectedItem.id).select().single();
      if (updated) { updateWishlistItem(updated); setSelectedItem(updated); }
    }
    setTransferring(false); setShowTransfer(false); setTransferAmount("");
  }

  async function handleComplete() {
    if (!completingItem || !cycle) return;
    setCompleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCompleting(false); return; }

    const shortfall = Math.max(0, completingItem.price - completingItem.current_amount);
    if (shortfall > 0) {
      const { data: expense } = await supabase.from("expenses").insert({ cycle_id: cycle.id, user_id: user.id, date: today(), amount: shortfall, category: "shopping", note: completingItem.name }).select().single();
      if (expense) addExpense(expense);
    }
    await supabase.from("wishlist_items").delete().eq("id", completingItem.id);
    const { name, price, current_amount } = completingItem;
    removeWishlistItem(completingItem.id);
    setCompleting(false); setCompletingItem(null); setSelectedItem(null);
    setShareCard({ name, price, saved: current_amount });
  }

  return (
    <div className="page-fade" style={{ background: "var(--bg)", minHeight: "100vh", paddingBottom: 90 }}>

      {/* 헤더 */}
      <div style={{ padding: "52px 20px 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: BURG, fontWeight: 900, fontSize: 24 }}>Bags</p>
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>목표 마쉬멜로 봉지</p>
        </div>
        {!isAtLimit && (
          <button
            onClick={() => setShowAdd(true)}
            style={{ background: BURG, color: "#FFFFFF", borderRadius: 99, padding: "9px 18px", fontSize: 13, fontWeight: 700, border: "none" }}
          >
            + 봉지 추가
          </button>
        )}
      </div>

      {/* 구운 요약 */}
      {totalSaved > 0 && (
        <div style={{ margin: "0 20px 20px", background: BURG, borderRadius: 18, padding: "16px 20px" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 }}>이번 봉지에서 구운 마쉬멜로</p>
          <p style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 26 }}>{formatMarshmallow(totalSaved)}</p>
        </div>
      )}

      {/* 목표 봉지 목록 */}
      <div style={{ margin: "0 20px 28px" }}>
        {wishlistItems.length === 0 ? (
          <div
            onClick={() => setShowAdd(true)}
            style={{ background: "#FFFFFF", borderRadius: 20, padding: "40px 20px", textAlign: "center", border: "1.5px dashed var(--border)", cursor: "pointer" }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎁</div>
            <p style={{ color: "var(--text2)", fontSize: 14, fontWeight: 600 }}>갖고 싶은 걸 봉지에 담아보세요</p>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>최대 3개까지</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {progressList.map(({ item, daysNeeded, alreadyAchievable }) => {
              const pct = Math.min(Math.round((item.current_amount / item.price) * 100), 100);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    background: "#FFFFFF", borderRadius: 20, overflow: "hidden",
                    boxShadow: "0 2px 10px var(--shadow)",
                    border: alreadyAchievable ? `1.5px solid ${GREEN}` : "none",
                    cursor: "pointer",
                  }}
                >
                  {/* 이미지 */}
                  <div style={{
                    height: 140, background: item.image_url ? `url(${item.image_url}) center/cover` : "var(--burg-light)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, position: "relative",
                  }}>
                    {!item.image_url && "🎁"}
                    <div style={{
                      position: "absolute", bottom: 12, right: 12,
                      background: alreadyAchievable ? GREEN : BURG,
                      color: "#FFFFFF", borderRadius: 99, padding: "5px 12px",
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {alreadyAchievable ? "🎉 완성 가능!" : daysNeeded > 0 ? `🏆 ${daysNeeded}일 뒤에 가질 수 있어요!` : "적립 중"}
                    </div>
                  </div>

                  <div style={{ padding: "14px 18px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 16 }}>{item.name}</p>
                      <span style={{ color: alreadyAchievable ? GREEN : BURG, fontWeight: 800, fontSize: 15 }}>{pct}%</span>
                    </div>

                    <p style={{ color: "var(--text2)", fontSize: 12, marginBottom: 8 }}>마쉬멜로 숙성도</p>

                    <div style={{ height: 6, borderRadius: 99, background: "var(--burg-light)", marginBottom: 8 }}>
                      <div style={{ height: 6, borderRadius: 99, width: `${pct}%`, background: alreadyAchievable ? GREEN : BURG, transition: "width 400ms ease" }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ color: "var(--text3)", fontSize: 10 }}>구운 개수</p>
                        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{item.current_amount.toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: "var(--text3)", fontSize: 10 }}>목표 금액</p>
                        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{item.price.toLocaleString()}</p>
                      </div>
                    </div>

                    {item.daily_auto_save > 0 && (
                      <p style={{ color: GREEN, fontSize: 11, marginTop: 8 }}>
                        하루 {formatMarshmallow(item.daily_auto_save)}씩 자동 적립 중
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {!isAtLimit && (
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  width: "100%", height: 54, borderRadius: 16, fontSize: 14, fontWeight: 600,
                  background: "transparent", color: "var(--text2)", border: "1.5px dashed var(--border)",
                }}
              >
                + 새 목표 봉지 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* ──── 목표 봉지 상세 시트 ──── */}
      <BottomSheet open={!!selectedItem} onClose={() => { setSelectedItem(null); setEditMode(false); }} title="">
        {selectedItem && (
          <div style={{ paddingBottom: 32 }}>
            {/* 이미지 */}
            {selectedItem.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedItem.image_url} alt={selectedItem.name} style={{ width: "100%", height: 200, objectFit: "cover" }} />
            ) : (
              <div style={{ height: 160, background: "var(--burg-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 }}>🎁</div>
            )}

            {/* D-day 뱃지 */}
            {currentProgress && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: -18 }}>
                <div style={{
                  background: currentProgress.alreadyAchievable ? GREEN : BURG,
                  color: "#FFFFFF", borderRadius: 99, padding: "7px 18px",
                  fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}>
                  {currentProgress.alreadyAchievable
                    ? "🎉 지금 완성 가능!"
                    : currentProgress.daysNeeded > 0
                    ? `🏆 ${currentProgress.daysNeeded}일 뒤에 가질 수 있어요!`
                    : "🍥 적립 중"}
                </div>
              </div>
            )}

            <div style={{ padding: "16px 20px 0" }}>
              {editMode ? (
                <div style={{ marginBottom: 16 }}>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="이름"
                    style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "var(--bg)", border: "1px solid var(--border)", outline: "none", color: "var(--text)", marginBottom: 8 }} />
                  <input value={editPrice} onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ""))} placeholder="목표 금액"
                    style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "var(--bg)", border: "1px solid var(--border)", outline: "none", color: "var(--text)" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={handleEditSave} style={{ flex: 1, height: 44, borderRadius: 12, background: BURG, color: "#FFFFFF", fontWeight: 700, fontSize: 14, border: "none" }}>저장</button>
                    <button onClick={() => setEditMode(false)} style={{ flex: 1, height: 44, borderRadius: 12, background: "var(--bg)", color: "var(--text2)", fontWeight: 700, fontSize: 14, border: "1px solid var(--border)" }}>취소</button>
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{selectedItem.name}</p>
              )}

              {/* 숙성도 */}
              <p style={{ color: "var(--text2)", fontSize: 12, marginBottom: 8 }}>마쉬멜로 숙성도</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "var(--text)", fontWeight: 900, fontSize: 22 }}>
                  {formatMarshmallow(selectedItem.current_amount)}
                </span>
                <span style={{ color: "var(--text2)", fontSize: 13, alignSelf: "flex-end" }}>
                  / {formatMarshmallow(selectedItem.price)}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "var(--burg-light)", marginBottom: 6 }}>
                <div style={{
                  height: 8, borderRadius: 99,
                  width: `${Math.min(Math.round((selectedItem.current_amount / selectedItem.price) * 100), 100)}%`,
                  background: currentProgress?.alreadyAchievable ? GREEN : BURG,
                  transition: "width 400ms ease",
                }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <p style={{ color: "var(--text3)", fontSize: 10 }}>구운 개수</p>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{selectedItem.current_amount.toLocaleString()}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "var(--text3)", fontSize: 10 }}>목표 금액</p>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{selectedItem.price.toLocaleString()}</p>
                </div>
              </div>

              {/* 굽기 강도 슬라이더 */}
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>오늘의 굽기 강도</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "var(--text3)", fontSize: 11 }}>LOW</span>
                <span style={{ color: GREEN, fontWeight: 700, fontSize: 13 }}>
                  {selectedItem.daily_auto_save > 0 ? `${formatMarshmallow(selectedItem.daily_auto_save)} P` : "없음"}
                </span>
                <span style={{ color: "var(--text3)", fontSize: 11 }}>MAX</span>
              </div>
              <input
                type="range"
                className="green-slider"
                min={0} max={sliderMax}
                step={Math.max(1000, Math.floor(sliderMax / 100))}
                value={selectedItem.daily_auto_save}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  updateWishlistItem({ ...selectedItem, daily_auto_save: val });
                  setSelectedItem({ ...selectedItem, daily_auto_save: val });
                }}
                onMouseUp={(e) => handleUpdateAutoSave(selectedItem, parseInt((e.target as HTMLInputElement).value, 10))}
                onTouchEnd={(e) => handleUpdateAutoSave(selectedItem, parseInt((e.target as HTMLInputElement).value, 10))}
                style={{ width: "100%", marginBottom: 20 }}
              />

              {/* 메인 버튼 */}
              <button
                onClick={() => setShowTransfer(true)}
                style={{ width: "100%", height: 52, borderRadius: 14, fontSize: 15, fontWeight: 700, background: BURG, color: "#FFFFFF", border: "none", marginBottom: 10 }}
              >
                🏠 생활비 봉지에서 가져오기
              </button>

              {currentProgress?.alreadyAchievable && (
                <button
                  onClick={() => setCompletingItem(selectedItem)}
                  style={{ width: "100%", height: 52, borderRadius: 14, fontSize: 15, fontWeight: 700, background: GREEN, color: "#FFFFFF", border: "none", marginBottom: 10 }}
                >
                  봉지 완성! 🎉
                </button>
              )}

              {/* 수정 / 삭제 */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setEditName(selectedItem.name); setEditPrice(String(selectedItem.price)); setEditMode(true); }}
                  style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  수정
                </button>
                <button
                  onClick={() => setPendingDeleteId(selectedItem.id)}
                  style={{ flex: 1, height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600, background: "#FEF2F2", color: "#B04040", border: "none" }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 이월 시트 */}
      <BottomSheet open={showTransfer} onClose={() => { setShowTransfer(false); setTransferAmount(""); }} title={`${selectedItem?.name ?? ""} 봉지로 이월`}>
        {selectedItem && (
          <div>
            <div style={{ padding: "12px 20px 8px" }}>
              <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 10 }}>생활비 봉지에서 이 봉지로 마쉬멜로를 보내요</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 12, color: "var(--text3)" }}>
                <span>현재 {formatMarshmallow(selectedItem.current_amount)}</span>
                <span>목표 {formatMarshmallow(selectedItem.price)}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, textAlign: "right", color: transferAmount ? "var(--text)" : "var(--text3)" }}>
                {transferAmount ? formatMarshmallow(parseInt(transferAmount, 10)) : "0개"}
              </div>
            </div>
            <NumberPad value={transferAmount} onChange={setTransferAmount} />
            <div style={{ padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
              {parseInt(transferAmount || "0") > remainingBalance && (
                <p style={{ color: "#B04040", fontSize: 12, textAlign: "center" }}>잔량({formatMarshmallow(remainingBalance)})보다 많아요</p>
              )}
              <button
                onClick={handleTransfer}
                disabled={!transferAmount || parseInt(transferAmount) > remainingBalance || transferring}
                style={{ width: "100%", height: 52, borderRadius: 14, fontSize: 15, fontWeight: 700, background: transferAmount && parseInt(transferAmount) <= remainingBalance && !transferring ? BURG : "var(--text3)", color: "#FFFFFF", border: "none" }}
              >
                {transferring ? "이월 중..." : "이월하기"}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 완성 확인 */}
      <BottomSheet open={!!completingItem} onClose={() => setCompletingItem(null)} title="봉지 완성! 🎉">
        {completingItem && (
          <div style={{ padding: "8px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ textAlign: "center", padding: "14px 0" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{completingItem.name}</p>
              <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 6 }}>{formatMarshmallow(completingItem.current_amount)} 모았어요</p>
              {completingItem.current_amount < completingItem.price && (
                <p style={{ color: "#B04040", fontSize: 12, marginTop: 4 }}>{formatMarshmallow(completingItem.price - completingItem.current_amount)} 부족 — 봉지에서 추가로 빠져요</p>
              )}
            </div>
            <button onClick={handleComplete} disabled={completing} style={{ width: "100%", height: 52, borderRadius: 14, fontSize: 15, fontWeight: 700, background: completing ? "var(--text3)" : GREEN, color: "#FFFFFF", border: "none" }}>
              {completing ? "처리 중..." : "봉지 완성!"}
            </button>
            <button onClick={() => setCompletingItem(null)} style={{ width: "100%", height: 52, borderRadius: 14, fontSize: 15, fontWeight: 700, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
              계속 굽기
            </button>
          </div>
        )}
      </BottomSheet>

      {/* 봉지 추가 시트 */}
      <BottomSheet open={showAdd} onClose={() => { setShowAdd(false); setItemName(""); setItemPrice(""); setItemImageUrl(""); setUrlInput(""); setDailyAutoSave(0); setInitialCapital(0); }} title="새 목표 봉지">
        <div style={{ padding: "8px 20px 4px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="url" placeholder="상품 URL (선택)" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              style={{ flex: 1, height: 42, padding: "0 12px", borderRadius: 10, fontSize: 13, background: "var(--bg)", border: "1px solid var(--border)", outline: "none", color: "var(--text)" }} />
            <button onClick={handleFetchUrl} disabled={!urlInput || fetching}
              style={{ height: 42, padding: "0 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", background: urlInput && !fetching ? BURG : "var(--text3)", color: "#FFFFFF", whiteSpace: "nowrap" }}>
              {fetching ? "..." : "가져오기"}
            </button>
          </div>
          {itemImageUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemImageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }} />
              <span style={{ color: GREEN, fontSize: 12 }}>이미지 가져오기 완료</span>
            </div>
          )}
          <input type="text" placeholder="뭘 굽고 싶어요?" value={itemName} onChange={(e) => setItemName(e.target.value)} maxLength={30}
            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, fontSize: 14, background: "var(--bg)", border: "1px solid var(--border)", outline: "none", color: "var(--text)", marginBottom: 12 }} />
          <p style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>목표 금액</p>
          <div style={{ fontSize: 28, fontWeight: 900, textAlign: "right", color: itemPrice ? "var(--text)" : "var(--text3)", marginBottom: 2 }}>
            {itemPrice ? formatMarshmallow(parseInt(itemPrice, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={itemPrice} onChange={setItemPrice} />
        <div style={{ padding: "8px 20px 4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>오늘의 굽기 강도 (자동 적립)</p>
            <span style={{ color: dailyAutoSave > 0 ? GREEN : "var(--text3)", fontWeight: 700, fontSize: 13 }}>
              {dailyAutoSave > 0 ? formatMarshmallow(dailyAutoSave) : "없음"}
            </span>
          </div>
          <input type="range" className="green-slider" min={0} max={Math.max(dailyBudget, 100000)}
            step={Math.max(1000, Math.floor(Math.max(dailyBudget, 100000) / 100))}
            value={dailyAutoSave} onChange={(e) => setDailyAutoSave(parseInt(e.target.value, 10))}
            style={{ width: "100%", marginBottom: 14 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>시작 자본 (생활비에서)</p>
            <span style={{ color: initialCapital > 0 ? GREEN : "var(--text3)", fontWeight: 700, fontSize: 13 }}>
              {initialCapital > 0 ? formatMarshmallow(initialCapital) : "없음"}
            </span>
          </div>
          <input type="range" className="green-slider" min={0} max={remainingBalance}
            step={Math.max(1000, Math.floor(remainingBalance / 100))}
            value={initialCapital} onChange={(e) => setInitialCapital(parseInt(e.target.value, 10))}
            style={{ width: "100%", marginBottom: 4 }} />
        </div>
        <div style={{ padding: "10px 20px 32px" }}>
          <button onClick={handleAddItem} disabled={!itemName || !itemPrice || saving}
            style={{ width: "100%", height: 52, borderRadius: 14, fontSize: 15, fontWeight: 700, background: itemName && itemPrice ? BURG : "var(--text3)", color: "#FFFFFF", border: "none" }}>
            {saving ? "저장 중..." : "굽기 시작!"}
          </button>
        </div>
      </BottomSheet>

      <ConfirmSheet open={!!pendingDeleteId} message="이 마쉬멜로 봉지를 없앨까요?" onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />

      {shareCard && (
        <BagShareCard open={!!shareCard} onClose={() => setShareCard(null)} itemName={shareCard.name} targetPrice={shareCard.price} savedAmount={shareCard.saved} />
      )}

      <BottomNav />
    </div>
  );
}

export default function BagsPage() {
  return <DataLoader><BagsContent /></DataLoader>;
}
