import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robot Arm Console",
  description: "서보 모터 원격 제어 및 데이터 분석 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
