"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useWishlistProgress, useCycleSummary } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { formatKRW } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NumberPad } from "@/components/ui/NumberPad";
import { BottomSheet } from "@/components/ui/BottomSheet";

export function WishlistCard() {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const addWishlistItem = useAppStore((s) => s.addWishlistItem);
  const removeWishlistItem = useAppStore((s) => s.removeWishlistItem);
  const progressList = useWishlistProgress();
  const { totalSaved, elapsedDays } = useCycleSummary();
  const hasNoSaving = elapsedDays === 0 || totalSaved === 0;

  const [showAdd, setShowAdd] = useState(false);
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
    } catch {
      // 실패 시 무시
    }
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
      })
      .select()
      .single();

    if (!error && data) addWishlistItem(data);
    setSaving(false);
    setItemName("");
    setItemPrice("");
    setItemImageUrl("");
    setUrlInput("");
    setShowAdd(false);
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("wishlist_items").delete().eq("id", id);
    removeWishlistItem(id);
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: "#191919" }}>
            나의 위시리스트
          </span>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm font-semibold px-3 h-8 rounded-lg btn-press"
            style={{ background: "#F7F7F8", color: "#FF6B35" }}
          >
            + 추가
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "#BBBBBB" }}>
            갖고 싶은 것을 추가해보세요
          </p>
        ) : hasNoSaving ? (
          <>
            {progressList.map(({ item }) => (
              <WishlistRow
                key={item.id}
                name={item.name}
                price={item.price}
                imageUrl={item.image_url}
                label="오늘부터 절약을 시작해보세요"
                labelColor="#888888"
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </>
        ) : (
          <>
            {progressList.map(({ item, daysNeeded, alreadyAchievable }) => (
              <WishlistRow
                key={item.id}
                name={item.name}
                price={item.price}
                imageUrl={item.image_url}
                label={
                  alreadyAchievable
                    ? "이미 달성 가능!"
                    : `${daysNeeded}일 더 아끼면 구매 가능`
                }
                labelColor={alreadyAchievable ? "#00B493" : "#888888"}
                highlight={alreadyAchievable}
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </>
        )}
      </Card>

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="위시리스트 추가">
        {/* 상품 링크로 자동 입력 */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold mb-2" style={{ color: "#888888" }}>
            상품 링크로 자동 입력 (선택사항)
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="상품 페이지 URL 붙여넣기"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl text-sm outline-none"
              style={{ background: "#F7F7F8", color: "#191919" }}
            />
            <button
              onClick={handleFetchUrl}
              disabled={!urlInput || fetching}
              className="h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap"
              style={{
                background: urlInput && !fetching ? "#FF6B35" : "#F7F7F8",
                color: urlInput && !fetching ? "#FFFFFF" : "#BBBBBB",
              }}
            >
              {fetching ? "..." : "가져오기"}
            </button>
          </div>
          {itemImageUrl && (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itemImageUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
                style={{ border: "1px solid #F0F0F0" }}
              />
              <span className="text-xs" style={{ color: "#00B493" }}>이미지 가져오기 완료</span>
            </div>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          <input
            type="text"
            placeholder="아이템 이름"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            maxLength={30}
            className="w-full h-11 px-4 rounded-xl text-sm outline-none"
            style={{ background: "#F7F7F8" }}
          />
        </div>
        <div className="px-4 pb-2">
          <div
            className="text-[32px] font-extrabold tabular-nums text-right"
            style={{ color: itemPrice ? "#191919" : "#BBBBBB" }}
          >
            ₩ {itemPrice ? formatKRW(parseInt(itemPrice, 10)) : "0"}
          </div>
        </div>
        <NumberPad value={itemPrice} onChange={setItemPrice} />
        <div className="px-4 pb-6">
          <button
            onClick={handleAddItem}
            disabled={!itemName || !itemPrice || saving}
            className="w-full h-[54px] rounded-xl text-base font-bold text-white"
            style={{ background: itemName && itemPrice ? "#FF6B35" : "#BBBBBB" }}
          >
            {saving ? "저장 중..." : "추가"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function WishlistRow({
  name, price, imageUrl, label, labelColor, highlight, onRemove,
}: {
  name: string; price: number; imageUrl?: string | null; label: string; labelColor: string;
  highlight?: boolean; onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 py-3 border-t"
      style={{
        borderColor: "#F0F0F0",
        background: highlight ? "#E6F9F5" : "transparent",
        borderRadius: highlight ? 10 : 0,
        padding: highlight ? "12px 10px" : "12px 0",
        marginTop: highlight ? 4 : 0,
      }}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          style={{ border: "1px solid #F0F0F0" }}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "#191919" }}>{name}</p>
        <p className="text-xs mt-0.5" style={{ color: labelColor }}>{label}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: "#191919" }}>
          ₩{formatKRW(price)}
        </p>
        <button
          onClick={onRemove}
          className="text-lg"
          style={{ color: "#BBBBBB" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
