"use client";

import { useEffect, ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        style={{ animation: "fade-in 200ms ease-out" }}
      />
      <div
        className="relative w-full rounded-t-3xl bg-white pb-safe"
        style={{
          maxWidth: 480,
          animation: "sheet-up 300ms ease-out",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F0F0F0]">
          <span className="text-base font-semibold text-[#191919]">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#888888] text-xl"
          >
            ×
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
