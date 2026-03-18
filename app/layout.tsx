import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import packageJson from "../package.json";
import { HelpButton } from "./components/HelpButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Импорт чатов в Мессенджер",
  description: "Импорт экспортированных чатов Telegram в Яндекс Мессенджер",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              Импорт чатов
            </Link>
            <div className="flex items-center gap-4">
              <HelpButton />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                v{packageJson.version}
              </span>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
