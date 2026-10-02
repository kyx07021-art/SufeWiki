import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "上财 Wiki · 学生共建校园知识库",
  description: "上海财经大学学生共同维护的校园 Wiki：学习、生活、成长机会与校园资源。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
