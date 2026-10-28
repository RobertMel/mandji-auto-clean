// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Bricolage Grotesque (licence OFL), embarquée dans le projet
const bricolage = localFont({
  src: "./fonts/bricolage-grotesque.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "Mandji Auto Clean — Lavage automobile à Port-Gentil",
  description:
    "Lavage automobile à Port-Gentil. Choisissez vos prestations, voyez le prix et réservez sur WhatsApp.",
};

export const viewport: Viewport = {
  themeColor: "#1F8A3B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={bricolage.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
