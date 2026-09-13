import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://clipin-ai.baikganteng88.chatgpt.site"),
  title: "KLIYU — Create Your Moment",
  description: "Turn long videos into short content worth sharing dengan Kliyu AI dan Kliyu Studio.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "KLIYU — Create Your Moment",
    description: "Turn long videos into short content worth sharing.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KLIYU — Create Your Moment" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
