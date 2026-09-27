import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SIPATUH",
    template: "%s · SIPATUH",
  },
  description:
    "Sistem Informasi Pemantauan Hasil Pemerintahan Kabupaten Konawe Selatan",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
