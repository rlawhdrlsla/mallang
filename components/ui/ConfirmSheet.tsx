"use client";

import { BottomSheet } from "./BottomSheet";

interface ConfirmSheetProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ open, message, onConfirm, onCancel }: ConfirmSheetProps) {
  return (
    <BottomSheet open={open} onClose={onCancel}>
      <div className="px-4 pb-8 pt-2">
        <p className="text-base font-semibold text-center mb-6" style={{ color: "#191919" }}>
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-[54px] rounded-xl text-base font-bold"
            style={{ background: "#F7F7F8", color: "#191919" }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-[54px] rounded-xl text-base font-bold text-white"
            style={{ background: "#FF3B30" }}
          >
            삭제
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
