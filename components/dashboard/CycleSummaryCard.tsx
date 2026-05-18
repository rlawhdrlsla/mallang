"use client";

import { useAppStore } from "@/store/app-store";
import { useCycleSummary } from "@/lib/hooks";
import { Card } from "@/components/ui/Card";
import { formatMarshmallow } from "@/lib/utils";
import { remainingDaysInCycle } from "@/lib/budget";

export function CycleSummaryCard() {
  const cycle = useAppStore((s) => s.cycle);
  const summary = useCycleSummary();

  if (!cycle) return null;

  const remaining = remainingDaysInCycle(cycle.next_payday);
  const { totalSaved, savedDays, elapsedDays, totalDays } = summary;

  return (
    <Card>
      <p className="text-sm font-semibold mb-3" style={{ color: "#111111" }}>
        이번 봉지 요약
      </p>
      <div className="space-y-2">
        <Row label="남은 기간" value={`${totalDays}일 중 ${remaining}일 남음`} />
        <Row
          label="구운 마쉬멜로"
          value={formatMarshmallow(totalSaved)}
          valueColor={totalSaved > 0 ? "#059669" : "#6B6B6B"}
        />
        <Row
          label="참은 날"
          value={`${savedDays}일 / ${elapsedDays}일`}
          valueColor="#111111"
        />
      </div>
    </Card>
  );
}

function Row({ label, value, valueColor = "#111111" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: "#6B6B6B" }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
