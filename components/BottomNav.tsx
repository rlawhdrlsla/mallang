"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BURG = "#5C3030";
const INACTIVE = "#C4A8A8";

const NAV_ITEMS = [
  {
    href: "/",
    label: "홈",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke={active ? BURG : INACTIVE} strokeWidth="1.8"
          fill={active ? "rgba(92,48,48,0.12)" : "none"} />
        <path d="M9 21V12h6v9" stroke={active ? BURG : INACTIVE} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/bags",
    label: "봉지",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M6 2l1.5 4H16.5L18 2" stroke={active ? BURG : INACTIVE} strokeWidth="1.8" strokeLinecap="round" />
        <rect x="3" y="6" width="18" height="15" rx="2"
          stroke={active ? BURG : INACTIVE} strokeWidth="1.8"
          fill={active ? "rgba(92,48,48,0.12)" : "none"} />
        <path d="M9 11c0 1.657 1.343 3 3 3s3-1.343 3-3"
          stroke={active ? BURG : INACTIVE} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "기록",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? BURG : INACTIVE} strokeWidth="1.8"
          fill={active ? "rgba(92,48,48,0.12)" : "none"} />
        <path d="M12 7v5l3 3" stroke={active ? BURG : INACTIVE} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "프로필",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={active ? BURG : INACTIVE} strokeWidth="1.8"
          fill={active ? "rgba(92,48,48,0.12)" : "none"} />
        <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
          stroke={active ? BURG : INACTIVE} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-40 flex items-center"
      style={{
        maxWidth: 480,
        height: 68,
        background: "#FFFFFF",
        borderTop: "1px solid #EAE0DC",
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            {icon(active)}
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? BURG : INACTIVE }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
