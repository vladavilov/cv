import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";

import { themeColorFallbacks } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

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
  title: "Vladyslav Avilov | AI Architect",
  description:
    "Vladyslav Avilov — AI Architect and Software Engineering Leader. 15+ years in trading platforms, agentic AI systems, and enterprise architecture at UBS and Luxoft.",
};

export const viewport: Viewport = {
  themeColor: themeColorFallbacks.background,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "min-h-screen bg-background text-foreground antialiased",
        )}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
