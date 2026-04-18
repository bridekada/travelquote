import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Travel Quote V2 — Travel Agent Sales Hub",
  description: "Generate quotes, manage vehicles, and track bookings seamlessly.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1A5F7A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
          {children}
        </div>
      </body>
    </html>
  );
}
