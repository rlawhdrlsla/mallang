import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "말랑",
  description: "오늘 아낀 돈이 내일 예산이 되는 일일 예산 가계부",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <div className="min-h-screen" style={{ background: "#F8F7F4" }}>
          <div className="mx-auto relative" style={{ maxWidth: 480, minHeight: "100svh", background: "#F8F7F4" }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
