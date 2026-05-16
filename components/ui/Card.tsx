"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-[#EEEEEE] ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform duration-100" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
