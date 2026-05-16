"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Card } from "@/components/ui/Card";
import { formatKRW } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NumberPad } from "@/components/ui/NumberPad";
import { BottomSheet } from "@/components/ui/BottomSheet";

export function WishlistCard() {
  const { wishlistItems, getWishlistProgress, addWishlistItem, removeWishlistItem } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const progressList = getWishlistProgress();
  const { totalSaved, elapsedDays } = useAppStore((s) => s.getCycleSummary());
  const hasNoSaving = elapsedDays === 0 || totalSaved === 0;

  async function handleAddItem() {
    if (!itemName || !itemPrice) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({ user_id: user.id, name: itemName, price: parseInt(itemPrice, 10) })
      .select()
      .single();

    if (!error && data) addWishlistItem(data);
    setSaving(false);
    setItemName("");
    setItemPrice("");
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
                label="오늘부터 시작해보세요"
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
                label={alreadyAchievable ? "이미 달성 가능!" : `${daysNeeded}일 후 달성`}
                labelColor={alreadyAchievable ? "#00B493" : "#888888"}
                highlight={alreadyAchievable}
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </>
        )}
      </Card>

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="위시리스트 추가">
        <div className="px-4 py-4 space-y-3">
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
  name, price, label, labelColor, highlight, onRemove,
}: {
  name: string; price: number; label: string; labelColor: string;
  highlight?: boolean; onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 border-t"
      style={{
        borderColor: "#F0F0F0",
        background: highlight ? "#E6F9F5" : "transparent",
        borderRadius: highlight ? 10 : 0,
        padding: highlight ? "12px 10px" : "12px 0",
        marginTop: highlight ? 4 : 0,
      }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: "#191919" }}>{name}</p>
        <p className="text-xs mt-0.5" style={{ color: labelColor }}>{label}</p>
      </div>
      <div className="flex items-center gap-3">
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
