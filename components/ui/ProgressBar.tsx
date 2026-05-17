"use client";

interface ProgressBarProps {
  value: number;  // 0~1
  danger?: boolean;
}

export function ProgressBar({ value, danger }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: "#E8E6DF" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-200"
        style={{
          width: `${pct}%`,
          background: danger ? "#DC2626" : "#059669",
        }}
      />
    </div>
  );
}
