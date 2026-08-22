import type { Metadata } from "next";
import "./globals.css";
import "./multiselect.css";

export const metadata: Metadata = {
  title: "Dashboard Jualan Zikra (2026)",
  description: "Dashboard prestasi jualan harian, mingguan dan bulanan Zikra.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ms"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
