"use client";

interface ProgressBarProps {
  value: number;  // 0~1
  danger?: boolean;
}

export function ProgressBar({ value, danger }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: "#F0F0F0" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-200"
        style={{
          width: `${pct}%`,
          background: danger ? "#FF3B30" : "#00B493",
        }}
      />
    </div>
  );
}
