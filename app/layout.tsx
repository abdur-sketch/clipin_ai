import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://clipin-ai.baikganteng88.chatgpt.site"),
  title: "CLIPIN AI — Long Video to Viral Clips",
  description: "Ubah video panjang menjadi short content yang memikat dengan deteksi momen, subtitle, hook, dan caption otomatis.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "CLIPIN AI — Long Video to Viral Clips",
    description: "Ubah video panjang menjadi short content yang memikat.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CLIPIN AI — Long Video to Viral Clips" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
