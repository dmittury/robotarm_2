import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robot Arm Console",
  description: "Remote servo control and data analysis dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
