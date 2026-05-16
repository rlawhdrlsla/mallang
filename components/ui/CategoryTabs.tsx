"use client";

import { Category } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/utils";

const CATEGORIES: Category[] = ["food", "transport", "shopping", "etc"];

interface CategoryTabsProps {
  value: Category | null;
  onChange: (c: Category) => void;
}

export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 px-4">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className="flex-1 h-9 rounded-lg text-sm font-semibold transition-colors duration-150"
          style={{
            background: value === cat ? "#191919" : "#F7F7F8",
            color: value === cat ? "#FFFFFF" : "#888888",
          }}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
