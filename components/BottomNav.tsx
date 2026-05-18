"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "생활비",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke={active ? "#FFFFFF" : "#555555"} strokeWidth="1.8" fill={active ? "rgba(255,255,255,0.15)" : "none"} />
        <path d="M9 21V12h6v9" stroke={active ? "#FFFFFF" : "#555555"} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "목표봉지",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke={active ? "#FFFFFF" : "#555555"} strokeWidth="1.8" fill={active ? "rgba(255,255,255,0.15)" : "none"} />
        <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke={active ? "#FFFFFF" : "#555555"} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "설정",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={active ? "#FFFFFF" : "#555555"} strokeWidth="1.8" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke={active ? "#FFFFFF" : "#555555"} strokeWidth="1.8" fill="none" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-40 flex items-center"
      style={{
        maxWidth: 480,
        height: 64,
        background: isHome ? "#1C1A1A" : "#FFFFFF",
        borderTop: isHome ? "1px solid #2E2C2C" : "1px solid #E8E6DF",
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href;
        const textColor = isHome
          ? (active ? "#FFFFFF" : "#555555")
          : (active ? "#111111" : "#BBBBBB");
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            {icon(active)}
            <span className="text-[11px] font-semibold" style={{ color: textColor }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
