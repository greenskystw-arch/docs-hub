import type { Metadata } from "next";
import { getTheme } from "@/lib/data";
import "./globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "文檔庫",
  description: "Markdown 文件管理：自訂分類與標籤",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();
  return (
    <html lang="zh-Hant" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
