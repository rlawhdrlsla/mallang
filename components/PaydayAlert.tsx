"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { isPaydayReached, getPreviousCycleSavings } from "@/lib/budget";
import { useDailySummaries } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import { formatKRW, today } from "@/lib/utils";

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
    // 현재 사이클 종료
    await supabase
      .from("cycles")
      .update({ ended_at: today() })
      .eq("id", cycle.id);

    // 새 사이클로 이동 (carry_over_amount 전달)
    const amt = withCarryover ? savedAmount : 0;
    router.push(`/setup?carryover=${amt}`);
  }

  if (showCarryover) {
    return (
      <div className="mx-5 mb-3 rounded-2xl p-5 border" style={{ background: "#E6F9F5", borderColor: "#00B493" }}>
        <p className="text-sm font-bold mb-1" style={{ color: "#00B493" }}>
          지난 사이클 절약액: ₩{formatKRW(savedAmount)}
        </p>
        <p className="text-sm mb-4" style={{ color: "#191919" }}>
          이 금액을 새 예산에 추가할까요?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleNewCycle(true)}
            className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
            style={{ background: "#00B493" }}
          >
            추가하기
          </button>
          <button
            onClick={() => handleNewCycle(false)}
            className="flex-1 h-10 rounded-xl text-sm font-bold"
            style={{ background: "#F7F7F8", color: "#888888" }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-3 rounded-2xl p-5 border" style={{ background: "#FFF0EB", borderColor: "#FF6B35" }}>
      <p className="text-sm font-bold mb-1" style={{ color: "#FF6B35" }}>월급일이 됐어요!</p>
      <p className="text-sm mb-4" style={{ color: "#191919" }}>새 사이클을 시작할까요?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowCarryover(true)}
          className="flex-1 h-10 rounded-xl text-sm font-bold text-white"
          style={{ background: "#FF6B35" }}
        >
          새 사이클 시작
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-1 h-10 rounded-xl text-sm font-bold"
          style={{ background: "#F7F7F8", color: "#888888" }}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
