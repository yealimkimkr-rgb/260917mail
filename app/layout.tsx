import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "뉴스레터 구독",
  description: "더블 옵트인 뉴스레터 구독 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-purple-50 text-gray-900">{children}</body>
    </html>
  );
}
