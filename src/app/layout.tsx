import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aural-ai.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "焕贞 AI 面试 | 语音与视频面试平台",
    template: "%s | 焕贞 AI 面试",
  },
  description:
    "焕贞 AI 面试是一个智能面试平台，支持结构化的语音、文字与视频面试。自动筛选候选人，实时洞察，规模化推进面试流程。",
  keywords: [
    "AI 面试平台",
    "语音面试",
    "AI 面试",
    "结构化面试",
    "视频面试",
    "自动面试",
    "候选人评估",
    "面试分析",
    "AI interview platform",
    "voice interview",
    "AI interviews",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "焕贞 AI 面试",
    title: "焕贞 AI 面试 | 语音与视频面试平台",
    description:
      "焕贞 AI 面试是一个智能面试平台，支持结构化的语音、文字与视频面试。自动筛选候选人，实时洞察，规模化推进面试流程。",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/images/marketing/hero-screenshots.webp`,
        width: 1920,
        height: 960,
        alt: "焕贞 AI 面试平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "焕贞 AI 面试 | 语音与视频面试平台",
    description:
      "焕贞 AI 面试是一个智能面试平台，支持结构化的语音、文字与视频面试。自动筛选候选人，实时洞察，规模化推进面试流程。",
    images: [`${siteUrl}/images/marketing/hero-screenshots.webp`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
