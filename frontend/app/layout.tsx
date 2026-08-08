import type {
  Metadata,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import SiteShell from "@/src/components/layout/SiteShell";

import {
  CartDrawerProvider,
} from "@/src/context/CartDrawerContext";

import {
  HeaderSettingsProvider,
} from "@/src/context/HeaderSettingsContext";

import {
  FooterSettingsProvider,
} from "@/src/context/FooterSettingsContext";

import "./globals.css";

/* =========================================================
   FONTS
========================================================= */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* =========================================================
   METADATA
========================================================= */

export const metadata: Metadata = {
  title: {
    default:
      "TownMela - Your Trusted Online Shopping Destination",

    template:
      "%s | TownMela",
  },

  description:
    "Shop quality products online at TownMela. Discover mobiles, laptops, electronics, accessories and more with a secure and convenient shopping experience.",
};

/* =========================================================
   TYPES
========================================================= */

type RootLayoutProps =
  Readonly<{
    children: React.ReactNode;
  }>;

/* =========================================================
   ROOT LAYOUT
========================================================= */

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
      `}
    >
      <body>
        <CartDrawerProvider>
          <HeaderSettingsProvider>
            <FooterSettingsProvider>
              <SiteShell>
                {children}
              </SiteShell>
            </FooterSettingsProvider>
          </HeaderSettingsProvider>
        </CartDrawerProvider>
      </body>
    </html>
  );
}