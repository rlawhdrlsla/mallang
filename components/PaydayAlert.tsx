"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { isPaydayReached, getPreviousCycleSavings } from "@/lib/budget";
import { useDailySummaries } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import { formatMarshmallow, today } from "@/lib/utils";

export function PaydayAlert() {
  const cycle = useAppStore((s) => s.cycle);
  const summaries = useDailySummaries();
  const [dismissed, setDismissed] = useState(false);
  const [showCarryover, setShowCarryover] = useState(false);
  const router = useRouter();

  if (!cycle || dismissed) return null;
  if (!isPaydayReached(cycle.next_payday)) return null;
  const savedAmount = getPreviousCycleSavings(summaries);

  async function handleNewCycle(withCarryover: boolean) {
    if (!cycle) return;
    const supabase = createClient();
    await supabase.from("cycles").update({ ended_at: today() }).eq("id", cycle.id);
    const amt = withCarryover ? savedAmount : 0;
    router.push(`/setup?newcycle=1&carryover=${amt}`);
  }

  if (showCarryover) {
    return (
      <div className="mx-5 mb-3 rounded-2xl p-5 border" style={{ background: "#ECFDF5", borderColor: "#059669" }}>
        <p className="text-sm font-bold mb-1" style={{ color: "#059669" }}>
          지난 봉지에서 구운 마쉬멜로: {formatMarshmallow(savedAmount)}
        </p>
        <p className="text-sm mb-4" style={{ color: "#111111" }}>
          새 봉지에 더해서 시작할까요?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleNewCycle(true)}
            className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
            style={{ background: "#059669" }}
          >
            추가하기
          </button>
          <button
            onClick={() => handleNewCycle(false)}
            className="flex-1 h-10 rounded-xl text-sm font-bold"
            style={{ background: "#F0EEE8", color: "#6B6B6B" }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-3 rounded-2xl p-5 border" style={{ background: "#FFFBEB", borderColor: "#D97706" }}>
      <p className="text-sm font-bold mb-1" style={{ color: "#D97706" }}>마쉬멜로 받는 날이에요! 🍥</p>
      <p className="text-sm mb-4" style={{ color: "#111111" }}>새 봉지를 시작할까요?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowCarryover(true)}
          className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
          style={{ background: "#D97706" }}
        >
          새 봉지 시작
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-1 h-10 rounded-xl text-sm font-bold"
          style={{ background: "#F0EEE8", color: "#6B6B6B" }}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
