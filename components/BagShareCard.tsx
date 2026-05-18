"use client";

import { useRef, useState } from "react";
import { BottomSheet } from "./ui/BottomSheet";
import { formatMarshmallow, formatDate } from "@/lib/utils";

interface BagShareCardProps {
  open: boolean;
  onClose: () => void;
  itemName: string;
  targetPrice: number;
  savedAmount: number;
}

export function BagShareCard({ open, onClose, itemName, targetPrice, savedAmount }: BagShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  async function handleSave() {
    if (!cardRef.current) return;
    setCapturing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `말랑이-봉지완성-${itemName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("capture failed", e);
    }
    setCapturing(false);
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <BottomSheet open={open} onClose={onClose} title="봉지 완성 🎉">
      <div className="px-4 pb-8 space-y-4">
        {/* 공유 카드 */}
        <div
          ref={cardRef}
          style={{
            background: "linear-gradient(135deg, #111111 0%, #2d2d2d 100%)",
            borderRadius: 24,
            padding: 28,
            textAlign: "center",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 8 }}>
            🍥 말랑이 봉지 완성
          </p>
          <p style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {itemName}
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 20 }}>
            {formatDate(todayStr)}
          </p>
          <div style={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "14px 0",
            marginBottom: 16,
          }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 }}>모은 마쉬멜로</p>
            <p style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
              {formatMarshmallow(savedAmount)}
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 4 }}>
              목표 {formatMarshmallow(targetPrice)}
            </p>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
            mallang.app
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={capturing}
          className="w-full h-[54px] rounded-xl text-base font-bold text-white"
          style={{ background: capturing ? "#BBBBBB" : "#111111" }}
        >
          {capturing ? "저장 중..." : "📸 이미지로 저장"}
        </button>
        <button
          onClick={onClose}
          className="w-full h-[44px] rounded-xl text-sm font-semibold"
          style={{ background: "#F0EEE8", color: "#6B6B6B" }}
        >
          닫기
        </button>
      </div>
    </BottomSheet>
  );
}
