import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravelQuote by JWRM",
  description: "Company-wide sales hub for managing quotes, vehicles, and bookings.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#00674F",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <div className="min-h-dvh flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
