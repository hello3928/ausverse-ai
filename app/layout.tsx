import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThemeScript from "@/components/layout/ThemeScript";
import PageTransitions from "@/components/layout/PageTransitions";
import ContextMenu from "@/components/ui/ContextMenu";
import ConsoleInit from "@/components/layout/ConsoleInit";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ausverse AI",
  description: "Ausverse AI — Secure Terminal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ausverse AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Ausverse AI */}
        <ThemeScript />
      </head>
      <body className={`${jetbrains.variable} antialiased`}>
        <ConsoleInit />
        <PageTransitions />
        <ContextMenu />
        {children}
      </body>
    </html>
  );
}
