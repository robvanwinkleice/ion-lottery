import type { Metadata } from "next";
import { Geist, Hanken_Grotesk } from "next/font/google";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist"
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken"
});

export const metadata: Metadata = {
  title: "ION Lottery",
  description: "Daily and weekly ION lottery dApp",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${hankenGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
