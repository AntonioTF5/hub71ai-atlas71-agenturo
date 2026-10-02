import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import RegisterSW from "@/components/atlas/RegisterSW";
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
  title: "Atlas71 · Should your startup move to Abu Dhabi?",
  description:
    "Atlas71 is an AI agent for founders: it answers whether Abu Dhabi fits your startup with sourced numbers, then picks your licence, prices the whole move and files the paperwork. Ask anything on the way.",
  applicationName: "Atlas71",
  appleWebApp: { capable: true, title: "Atlas71", statusBarStyle: "default" },
  // Filing references and amounts must not turn into tappable phone numbers on iOS.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#F6F5F1",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android shrinks the layout when the keyboard opens, so the composer stays above it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh bg-paper font-sans text-ink">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
