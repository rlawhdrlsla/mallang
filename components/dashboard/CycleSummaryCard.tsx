"use client";

import { useAppStore } from "@/store/app-store";
import { Card } from "@/components/ui/Card";
import { formatKRW } from "@/lib/utils";
import { remainingDaysInCycle } from "@/lib/budget";

export function CycleSummaryCard() {
  const cycle = useAppStore((s) => s.cycle);
  const summary = useAppStore((s) => s.getCycleSummary());

  if (!cycle) return null;

  const remaining = remainingDaysInCycle(cycle.next_payday);
  const { totalSaved, savedDays, elapsedDays, totalDays } = summary;

  return (
    <Card>
      <p className="text-sm font-semibold mb-3" style={{ color: "#191919" }}>
        이번 사이클 요약
      </p>
      <div className="space-y-2">
        <Row label="남은 기간" value={`${totalDays}일 중 ${remaining}일 남음`} />
        <Row
          label="누적 절약"
          value={`₩${formatKRW(totalSaved)}`}
          valueColor={totalSaved > 0 ? "#00B493" : "#888888"}
        />
        <Row
          label="절약한 날"
          value={`${savedDays}일 / ${elapsedDays}일`}
          valueColor="#FF6B35"
        />
      </div>
    </Card>
  );
}

function Row({ label, value, valueColor = "#191919" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: "#888888" }}>{label}</span>
      <span className="text-sm font-bold tabular-nums" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
