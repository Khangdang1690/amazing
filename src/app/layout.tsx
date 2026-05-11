import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { SHOP } from "@/lib/env";

const serif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SHOP.name} — Barbershop in Westminster`,
    template: `%s · ${SHOP.name}`,
  },
  description:
    "Sharp cuts, fades, and traditional shaves in Westminster, CA. Book online — see prices, pick your barber, and reserve a time.",
  openGraph: {
    title: SHOP.name,
    description:
      "Sharp cuts, fades, and traditional shaves in Westminster, CA.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        <div className="grain-overlay" aria-hidden />
        <Nav />
        <main className="relative flex-1">{children}</main>
        <Footer />
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
