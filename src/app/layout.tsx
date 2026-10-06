import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://echo-baby-roan.vercel.app"), // 🎯 Добавлено для устранения варнинга
  title: "Echo Baby — Умная Аудио-Няня",
  description:
    "Веб-приложение для автоматической записи звуков. Слушает микрофон и пишет WAV-клипы при превышении порога громкости. 6 визуализаторов, тёмная тема, IndexedDB.",
  keywords: [
    "аудио няня",
    "запись звука",
    "baby monitor",
    "audio recorder",
    "web audio",
    "WAV",
  ],
  authors: [{ name: "Alexey Semenov", url: "https://github.com/graphica-online" }],
  creator: "Alexey Semenov",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://echo-baby-roan.vercel.app/",
    siteName: "Echo Baby",
    title: "Echo Baby — Умная Аудио-Няня",
    description:
      "Автоматическая запись звуков через микрофон. 6 визуализаторов спектра, тёмная и светлая темы, приватное хранение в браузере.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echo Baby — Умная Аудио-Няня",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Echo Baby — Умная Аудио-Няня",
    description:
      "Автоматическая запись звуков через микрофон. 6 визуализаторов, приватность, IndexedDB.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}