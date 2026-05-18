"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useWishlistProgress, useCycleSummary, useRemainingBudget } from "@/lib/hooks";
import { WishlistItem } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { formatMarshmallow, today } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NumberPad } from "@/components/ui/NumberPad";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";

export function WishlistCard() {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const addWishlistItem = useAppStore((s) => s.addWishlistItem);
  const removeWishlistItem = useAppStore((s) => s.removeWishlistItem);
  const addExpense = useAppStore((s) => s.addExpense);
  const cycle = useAppStore((s) => s.cycle);
  const progressList = useWishlistProgress();
  const { totalSaved, elapsedDays } = useCycleSummary();
  const { remainingBalance, remainingDays } = useRemainingBudget();
  const hasNoSaving = elapsedDays === 0 || totalSaved === 0;

  const [showAdd, setShowAdd] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [purchaseItem, setPurchaseItem] = useState<WishlistItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFetchUrl() {
    if (!urlInput) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(urlInput)}`);
      const data = await res.json();
      if (data.title && !itemName) setItemName(data.title.slice(0, 30));
      if (data.price && !itemPrice) setItemPrice(String(data.price));
      if (data.image) setItemImageUrl(data.image);
    } catch { /* 실패 시 무시 */ }
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
      .insert({ user_id: user.id, name: itemName, price: parseInt(itemPrice, 10), image_url: itemImageUrl || null })
      .select().single();

    if (!error && data) addWishlistItem(data);
    setSaving(false);
    setItemName(""); setItemPrice(""); setItemImageUrl(""); setUrlInput("");
    setShowAdd(false);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const supabase = createClient();
    await supabase.from("wishlist_items").delete().eq("id", pendingDeleteId);
    removeWishlistItem(pendingDeleteId);
    setPendingDeleteId(null);
  }

  async function handlePurchase() {
    if (!purchaseItem || !cycle) return;
    setPurchasing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPurchasing(false); return; }

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        cycle_id: cycle.id,
        user_id: user.id,
        date: today(),
        amount: purchaseItem.price,
        category: "shopping",
        note: purchaseItem.name,
      })
      .select().single();

    if (!error && expense) {
      addExpense(expense);
      await supabase.from("wishlist_items").delete().eq("id", purchaseItem.id);
      removeWishlistItem(purchaseItem.id);
    }
    setPurchasing(false);
    setPurchaseItem(null);
  }

  const price = purchaseItem?.price ?? 0;
  const afterBalance = remainingBalance - price;
  const currentDailyBudget = remainingDays > 0 ? Math.floor(remainingBalance / remainingDays) : 0;
  const afterDailyBudget = remainingDays > 0 ? Math.floor(Math.max(0, afterBalance) / remainingDays) : 0;
  const isAffordable = afterBalance >= 0;

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: "#111111" }}>굽는 중인 마쉬멜로</span>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm font-semibold px-3 h-8 rounded-lg btn-press"
            style={{ background: "#F0EEE8", color: "#111111" }}
          >
            + 추가
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "#BBBBBB" }}>갖고 싶은 걸 등록해보세요</p>
        ) : hasNoSaving ? (
          progressList.map(({ item }) => (
            <GoalRow
              key={item.id}
              item={item}
              label="오늘부터 아끼기 시작해봐요"
              labelColor="#6B6B6B"
              onRemove={() => setPendingDeleteId(item.id)}
              onPurchase={() => setPurchaseItem(item)}
            />
          ))
        ) : (
          progressList.map(({ item, daysNeeded, alreadyAchievable }) => (
            <GoalRow
              key={item.id}
              item={item}
              label={alreadyAchievable ? "지금 바로 구울 수 있어요!" : `${daysNeeded}일 더 참으면 구울 수 있어요`}
              labelColor={alreadyAchievable ? "#059669" : "#6B6B6B"}
              highlight={alreadyAchievable}
              onRemove={() => setPendingDeleteId(item.id)}
              onPurchase={() => setPurchaseItem(item)}
            />
          ))
        )}
      </Card>

      {/* 삭제 확인 */}
      <ConfirmSheet
        open={!!pendingDeleteId}
        message="이 마쉬멜로를 목록에서 지울까요?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* 봉지 완성 확인 시트 */}
      <BottomSheet open={!!purchaseItem} onClose={() => setPurchaseItem(null)} title="봉지 완성! 🎉">
        {purchaseItem && (
          <div className="px-4 pb-8">
            <div className="flex items-center gap-3 py-3 mb-4">
              {purchaseItem.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={purchaseItem.image_url} alt={purchaseItem.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  style={{ border: "1px solid #E8E6DF" }}
                />
              )}
              <div>
                <p className="text-base font-semibold" style={{ color: "#111111" }}>{purchaseItem.name}</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: "#111111" }}>
                  {formatMarshmallow(purchaseItem.price)}
                </p>
              </div>
            </div>

            {/* 예산 영향 */}
            <div className="rounded-2xl p-4 mb-5" style={{ background: "#F8F7F4" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "#6B6B6B" }}>
                구우면 봉지가 이렇게 바뀌어요
              </p>
              <ImpactRow
                label="오늘 일비"
                before={formatMarshmallow(currentDailyBudget)}
                after={formatMarshmallow(afterDailyBudget)}
                afterColor={isAffordable ? "#111111" : "#DC2626"}
              />
              <ImpactRow
                label="남은 마쉬멜로"
                before={formatMarshmallow(remainingBalance)}
                after={isAffordable ? formatMarshmallow(afterBalance) : "봉지 부족"}
                afterColor={isAffordable ? "#111111" : "#DC2626"}
              />
            </div>

            {!isAffordable && (
              <p className="text-xs text-center mb-4" style={{ color: "#DC2626" }}>
                {formatMarshmallow(Math.abs(afterBalance))} 부족해요
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPurchaseItem(null)}
                className="flex-1 h-[54px] rounded-xl text-base font-bold"
                style={{ background: "#F0EEE8", color: "#111111" }}
              >
                취소
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="flex-1 h-[54px] rounded-xl text-base font-bold text-white"
                style={{ background: purchasing ? "#BBBBBB" : "#111111" }}
              >
                {purchasing ? "처리 중..." : "봉지 완성!"}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 마쉬멜로 추가 시트 */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="마쉬멜로 굽기">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold mb-2" style={{ color: "#6B6B6B" }}>
            상품 링크로 자동 입력 (선택사항)
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="상품 페이지 URL 붙여넣기"
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
              <img src={itemImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover"
                style={{ border: "1px solid #E8E6DF" }} />
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
        <div className="px-4 pb-2">
          <div className="text-[32px] font-extrabold text-right"
            style={{ color: itemPrice ? "#111111" : "#BBBBBB" }}>
            {itemPrice ? formatMarshmallow(parseInt(itemPrice, 10)) : "0개"}
          </div>
        </div>
        <NumberPad value={itemPrice} onChange={setItemPrice} />
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

function ImpactRow({ label, before, after, afterColor }: {
  label: string; before: string; after: string; afterColor: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: "#E8E6DF" }}>
      <span className="text-sm" style={{ color: "#6B6B6B" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm line-through" style={{ color: "#BBBBBB" }}>{before}</span>
        <span className="text-xs" style={{ color: "#BBBBBB" }}>→</span>
        <span className="text-sm font-bold" style={{ color: afterColor }}>{after}</span>
      </div>
    </div>
  );
}

function GoalRow({ item, label, labelColor, highlight, onRemove, onPurchase }: {
  item: WishlistItem; label: string; labelColor: string;
  highlight?: boolean; onRemove: () => void; onPurchase: () => void;
}) {
  return (
    <div
      className="border-t"
      style={{
        borderColor: "#E8E6DF",
        background: highlight ? "#ECFDF5" : "transparent",
        borderRadius: highlight ? 10 : 0,
        padding: highlight ? "12px 10px" : "12px 0",
        marginTop: highlight ? 4 : 0,
      }}
    >
      <div className="flex items-center gap-3">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            style={{ border: "1px solid #E8E6DF" }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#111111" }}>{item.name}</p>
          <p className="text-xs mt-0.5" style={{ color: labelColor }}>{label}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: "#111111" }}>
            {formatMarshmallow(item.price)}
          </p>
          <button onClick={onRemove} className="text-lg" style={{ color: "#BBBBBB" }}>×</button>
        </div>
      </div>
      <button
        onClick={onPurchase}
        className="mt-3 w-full h-10 rounded-xl text-sm font-bold"
        style={{
          background: highlight ? "#059669" : "#111111",
          color: "#FFFFFF",
        }}
      >
        봉지 완성!
      </button>
    </div>
  );
}
