import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://clipin-ai.baikganteng88.chatgpt.site"),
  title: "KLIYU — Create Your Moment",
  description: "Personal content business OS untuk mengubah video panjang menjadi short clips, melacak performa, dan mencatat pendapatan.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "KLIYU", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "KLIYU — Create Your Moment",
    description: "From long video to clips, performance insights, and revenue in one personal workspace.",
    images: [{ url: "/og-personal.png", width: 1730, height: 909, alt: "KLIYU — Clip. Learn. Earn." }],
  },
  twitter: { card: "summary_large_image", images: ["/og-personal.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
