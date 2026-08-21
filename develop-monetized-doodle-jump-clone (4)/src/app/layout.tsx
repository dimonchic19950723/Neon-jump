import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";

// Оба семейства — variable fonts: один файл покрывает все начертания,
// вместо отдельного файла для каждого веса.
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEON JUMP — играй и зарабатывай",
  description:
    "Хардкорный аркадный прыгун в стиле Doodle Jump. Собирай монеты, смотри рекламу после проигрыша и получай долю дохода в рублях.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b0620",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${manrope.variable}`}>
      <body className="bg-[#0b0620] text-white antialiased">{children}</body>
    </html>
  );
}
