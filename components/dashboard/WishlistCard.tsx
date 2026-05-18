"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useWishlistProgress, useRemainingBudget } from "@/lib/hooks";
import { WishlistItem } from "@/lib/types";
import { formatMarshmallow, today } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NumberPad } from "@/components/ui/NumberPad";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { BagShareCard } from "@/components/BagShareCard";

const MAX_GOAL_BAGS = 3;

export function WishlistCard() {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const addWishlistItem = useAppStore((s) => s.addWishlistItem);
  const updateWishlistItem = useAppStore((s) => s.updateWishlistItem);
  const removeWishlistItem = useAppStore((s) => s.removeWishlistItem);
  const addExpense = useAppStore((s) => s.addExpense);
  const cycle = useAppStore((s) => s.cycle);
  const progressList = useWishlistProgress();
  const { remainingBalance, remainingDays } = useRemainingBudget();

  const [showAdd, setShowAdd] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<WishlistItem | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [completingItem, setCompletingItem] = useState<WishlistItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const [shareCard, setShareCard] = useState<{ name: string; price: number; saved: number } | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [dailyAutoSave, setDailyAutoSave] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

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
        current_amount: 0,
        daily_auto_save: dailyAutoSave ? parseInt(dailyAutoSave, 10) : 0,
      })
      .select().single();

    if (!error && data) addWishlistItem(data);
    setSaving(false);
    setItemName(""); setItemPrice(""); setItemImageUrl(""); setUrlInput(""); setDailyAutoSave("");
    setShowAdd(false);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const supabase = createClient();
    await supabase.from("wishlist_items").delete().eq("id", pendingDeleteId);
    removeWishlistItem(pendingDeleteId);
    setPendingDeleteId(null);
  }

  async function handleTransfer() {
    if (!transferTarget || !transferAmount || !cycle) return;
    const amount = parseInt(transferAmount, 10);
    if (amount <= 0) return;
    setTransferring(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setTransferring(false); return; }

    // 생활비 봉지에서 지출 기록
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        cycle_id: cycle.id,
        user_id: user.id,
        date: today(),
        amount,
        category: "etc",
        note: `${transferTarget.name} 봉지로 이월`,
      })
      .select().single();

    if (!expenseError && expense) {
      addExpense(expense);
      // 목표 봉지 누적액 업데이트
      const newAmount = Math.min(transferTarget.current_amount + amount, transferTarget.price);
      const { data: updated } = await supabase
        .from("wishlist_items")
        .update({ current_amount: newAmount })
        .eq("id", transferTarget.id)
        .select().single();
      if (updated) updateWishlistItem(updated);
    }

    setTransferring(false);
    setTransferTarget(null);
    setTransferAmount("");
  }

  async function handleComplete() {
    if (!completingItem || !cycle) return;
    setCompleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCompleting(false); return; }

    // 미달성 금액만 지출 기록
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
    const itemName = completingItem.name;
    const itemPrice = completingItem.price;
    await supabase.from("wishlist_items").delete().eq("id", completingItem.id);
    removeWishlistItem(completingItem.id);
    setCompleting(false);
    setCompletingItem(null);
    setShareCard({ name: itemName, price: itemPrice, saved: savedAmount });
  }

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-bold" style={{ color: "#111111" }}>
          굽는 중인 마쉬멜로 🍥
        </span>
        <button
          onClick={() => setShowAdd(true)}
          disabled={isAtLimit}
          className="text-xs font-semibold px-3 h-7 rounded-lg"
          style={{
            background: isAtLimit ? "#F0EEE8" : "#111111",
            color: isAtLimit ? "#BBBBBB" : "#FFFFFF",
          }}
        >
          {isAtLimit ? "봉지 3개 최대" : "+ 봉지 추가"}
        </button>
      </div>

      {wishlistItems.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "#FFFFFF", border: "1.5px dashed #E8E6DF" }}
        >
          <p className="text-sm" style={{ color: "#BBBBBB" }}>갖고 싶은 걸 봉지에 담아보세요</p>
          <p className="text-xs mt-1" style={{ color: "#BBBBBB" }}>최대 3개까지 굽는 중</p>
        </div>
      ) : (
        <div className="space-y-3">
          {progressList.map(({ item, daysNeeded, alreadyAchievable }) => (
            <GoalBagCard
              key={item.id}
              item={item}
              daysNeeded={daysNeeded}
              alreadyAchievable={alreadyAchievable}
              remainingBalance={remainingBalance}
              remainingDays={remainingDays}
              onRemove={() => setPendingDeleteId(item.id)}
              onTransfer={() => setTransferTarget(item)}
              onComplete={() => setCompletingItem(item)}
            />
          ))}
        </div>
      )}

      {/* 삭제 확인 */}
      <ConfirmSheet
        open={!!pendingDeleteId}
        message="이 마쉬멜로 봉지를 없앨까요?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* 이월 시트 */}
      <BottomSheet
        open={!!transferTarget}
        onClose={() => { setTransferTarget(null); setTransferAmount(""); }}
        title={`${transferTarget?.name ?? ""} 봉지로 이월`}
      >
        {transferTarget && (
          <div>
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs mb-2" style={{ color: "#6B6B6B" }}>
                생활비 봉지에서 이 봉지로 마쉬멜로를 보내요
              </p>
              <div className="flex justify-between text-xs mb-3" style={{ color: "#BBBBBB" }}>
                <span>현재 적립: {formatMarshmallow(transferTarget.current_amount)}</span>
                <span>목표: {formatMarshmallow(transferTarget.price)}</span>
              </div>
              <div className="text-[32px] font-extrabold text-right" style={{ color: transferAmount ? "#111111" : "#BBBBBB" }}>
                {transferAmount ? formatMarshmallow(parseInt(transferAmount, 10)) : "0개"}
              </div>
            </div>
            <NumberPad value={transferAmount} onChange={setTransferAmount} />
            <div className="px-4 pb-6 space-y-2">
              {parseInt(transferAmount || "0") > remainingBalance && (
                <p className="text-xs text-center" style={{ color: "#DC2626" }}>
                  봉지 잔량({formatMarshmallow(remainingBalance)})보다 많아요
                </p>
              )}
              <button
                onClick={handleTransfer}
                disabled={!transferAmount || parseInt(transferAmount) > remainingBalance || transferring}
                className="w-full h-[54px] rounded-xl text-base font-bold text-white"
                style={{
                  background: transferAmount && parseInt(transferAmount) <= remainingBalance && !transferring
                    ? "#111111" : "#BBBBBB"
                }}
              >
                {transferring ? "이월 중..." : "이월하기"}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 봉지 완성 확인 */}
      <BottomSheet open={!!completingItem} onClose={() => setCompletingItem(null)} title="봉지 완성! 🎉">
        {completingItem && (
          <div className="px-4 pb-8 space-y-4">
            <div className="text-center py-4">
              <p className="text-xl font-bold" style={{ color: "#111111" }}>{completingItem.name}</p>
              <p className="text-sm mt-1" style={{ color: "#6B6B6B" }}>
                지금까지 {formatMarshmallow(completingItem.current_amount)} 모았어요
              </p>
              {completingItem.current_amount < completingItem.price && (
                <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                  {formatMarshmallow(completingItem.price - completingItem.current_amount)} 부족 — 봉지에서 추가로 빠져요
                </p>
              )}
            </div>
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full h-[54px] rounded-xl text-base font-bold text-white"
              style={{ background: completing ? "#BBBBBB" : "#111111" }}
            >
              {completing ? "처리 중..." : "봉지 완성!"}
            </button>
            <button
              onClick={() => setCompletingItem(null)}
              className="w-full h-[54px] rounded-xl text-base font-bold"
              style={{ background: "#F0EEE8", color: "#111111" }}
            >
              계속 굽기
            </button>
          </div>
        )}
      </BottomSheet>

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

      {/* 봉지 추가 시트 */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="새 마쉬멜로 봉지">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold mb-2" style={{ color: "#6B6B6B" }}>상품 링크로 자동 입력 (선택)</p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="상품 URL 붙여넣기"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl text-sm outline-none"
              style={{ background: "#F0EEE8", color: "#111111" }}
            />
            <button
              onClick={handleFetchUrl}
              disabled={!urlInput || fetching}
              className="h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap"
              style={{
                background: urlInput && !fetching ? "#111111" : "#F0EEE8",
                color: urlInput && !fetching ? "#FFFFFF" : "#BBBBBB",
              }}
            >
              {fetching ? "..." : "가져오기"}
            </button>
          </div>
          {itemImageUrl && (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ border: "1px solid #E8E6DF" }} />
              <span className="text-xs" style={{ color: "#059669" }}>이미지 가져오기 완료</span>
            </div>
          )}
        </div>

        <div className="px-4 py-2">
          <input
            type="text"
            placeholder="뭘 굽고 싶어요?"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            maxLength={30}
            className="w-full h-11 px-4 rounded-xl text-sm outline-none"
            style={{ background: "#F0EEE8" }}
          />
        </div>
        <div className="px-4 pb-1">
          <p className="text-xs font-semibold mb-1" style={{ color: "#6B6B6B" }}>목표 금액</p>
          <div className="text-[32px] font-extrabold text-right" style={{ color: itemPrice ? "#111111" : "#BBBBBB" }}>
            {itemPrice ? formatMarshmallow(parseInt(itemPrice, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={itemPrice} onChange={setItemPrice} />

        <div className="px-4 pb-2 pt-1">
          <p className="text-xs font-semibold mb-1" style={{ color: "#6B6B6B" }}>하루 자동 적립 (선택)</p>
          <p className="text-xs mb-2" style={{ color: "#BBBBBB" }}>생활비에서 매일 이만큼 자동으로 보내요</p>
          <div className="text-[24px] font-extrabold text-right" style={{ color: dailyAutoSave ? "#111111" : "#BBBBBB" }}>
            {dailyAutoSave ? formatMarshmallow(parseInt(dailyAutoSave, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={dailyAutoSave} onChange={setDailyAutoSave} />

        <div className="px-4 pb-6">
          <button
            onClick={handleAddItem}
            disabled={!itemName || !itemPrice || saving}
            className="w-full h-[54px] rounded-xl text-base font-bold text-white"
            style={{ background: itemName && itemPrice ? "#111111" : "#BBBBBB" }}
          >
            {saving ? "저장 중..." : "굽기 시작"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function GoalBagCard({
  item, daysNeeded, alreadyAchievable, remainingBalance, remainingDays, onRemove, onTransfer, onComplete,
}: {
  item: WishlistItem; daysNeeded: number; alreadyAchievable: boolean;
  remainingBalance: number; remainingDays: number;
  onRemove: () => void; onTransfer: () => void; onComplete: () => void;
}) {
  const progress = Math.min(item.current_amount / item.price, 1);
  const pct = Math.round(progress * 100);
  const canCompleteNow = item.current_amount >= item.price || remainingBalance >= (item.price - item.current_amount);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        border: alreadyAchievable ? "1.5px solid #059669" : "none",
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-3">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            style={{ border: "1px solid #E8E6DF" }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold truncate" style={{ color: "#111111" }}>{item.name}</p>
            <button onClick={onRemove} className="text-lg flex-shrink-0 ml-2" style={{ color: "#BBBBBB" }}>×</button>
          </div>
          <p className="text-xs mt-0.5" style={{ color: alreadyAchievable ? "#059669" : "#6B6B6B" }}>
            {alreadyAchievable ? "지금 바로 구울 수 있어요! 🎉" : daysNeeded > 0 ? `${daysNeeded}일 더 참으면` : "적립 중"}
          </p>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1" style={{ color: "#BBBBBB" }}>
          <span>{formatMarshmallow(item.current_amount)}</span>
          <span>{pct}% · 목표 {formatMarshmallow(item.price)}</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "#F0EEE8" }}>
          <div style={{
            height: 6, borderRadius: 999, width: `${pct}%`,
            background: alreadyAchievable ? "#059669" : "#111111",
            transition: "width 400ms ease",
          }} />
        </div>
      </div>

      {/* 하루 자동 적립 정보 */}
      {item.daily_auto_save > 0 && (
        <p className="text-xs mb-3" style={{ color: "#6B6B6B" }}>
          하루 {formatMarshmallow(item.daily_auto_save)}씩 자동 적립 중
        </p>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={onTransfer}
          className="flex-1 h-9 rounded-xl text-xs font-bold"
          style={{ background: "#F0EEE8", color: "#111111" }}
        >
          생활비에서 이월
        </button>
        {(alreadyAchievable || canCompleteNow) && (
          <button
            onClick={onComplete}
            className="flex-1 h-9 rounded-xl text-xs font-bold text-white"
            style={{ background: "#059669" }}
          >
            봉지 완성! 🎉
          </button>
        )}
      </div>
    </div>
  );
}
