import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TrackBeacon } from "@/components/track-beacon";

const sora = Sora({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Kviz Matura — Banka pitanja: Matematika, Bosanski, Engleski",
  description:
    "Interaktivna aplikacija za učenje i testiranje: 1581 pitanje iz matematike, bosanskog i engleskog jezika — osnovna i srednja škola u jednoj aplikaciji. Mod učenja sa objašnjenjima i mod testiranja kao pravi ispit.",
  keywords: ["kviz", "matematika", "bosanski jezik", "engleski jezik", "matura", "završni rad", "pitanja", "učenje", "testiranje"],
  authors: [{ name: "Kviz Matura" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#065f46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bs" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${inter.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <TrackBeacon />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
