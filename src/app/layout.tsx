import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "台灣公司統編查詢",
  description: "輸入統一編號，即時查詢台灣公司登記資料",
  openGraph: {
    title: "台灣公司統編查詢",
    description: "輸入統一編號，即時查詢台灣公司登記資料",
    locale: "zh_TW",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">{children}</body>
    </html>
  );
}
