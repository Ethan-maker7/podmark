import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PodMark - Podcast Reader",
  description: "Mark what you hear. Keep what you learn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
