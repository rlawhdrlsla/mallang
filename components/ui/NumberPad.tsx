"use client";

interface NumberPadProps {
  value: string;
  onChange: (v: string) => void;
}

const BUTTONS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["00", "0", "←"],
];

export function NumberPad({ value, onChange }: NumberPadProps) {
  function press(key: string) {
    if (key === "←") {
      onChange(value.slice(0, -1) || "");
      return;
    }
    if (value === "" && key === "00") return;
    const next = value + key;
    if (parseInt(next, 10) > 9_999_999) return; // 최대 9,999,999원
    onChange(next);
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {BUTTONS.flat().map((key) => (
        <button
          key={key}
          onClick={() => press(key)}
          className="h-[60px] rounded-xl text-[22px] font-semibold text-[#191919] btn-press"
          style={{ background: "#F7F7F8" }}
          onMouseDown={(e) => (e.currentTarget.style.background = "#EEEEEE")}
          onMouseUp={(e) => (e.currentTarget.style.background = "#F7F7F8")}
          onTouchStart={(e) => (e.currentTarget.style.background = "#EEEEEE")}
          onTouchEnd={(e) => (e.currentTarget.style.background = "#F7F7F8")}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
