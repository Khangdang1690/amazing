import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Newsreader, DM_Sans, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { SHOP } from "@/lib/env";
import { LOCALES, isLocale } from "@/i18n/config";
import { getDictionary, tt } from "@/i18n/dictionaries";

const serif = Newsreader({
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: {
      default: tt(dict.metadata.siteTitleDefault, { shop: SHOP.name }),
      template: dict.metadata.siteTitleTemplate,
    },
    description: dict.metadata.siteDescription,
    openGraph: {
      title: SHOP.name,
      description: dict.metadata.ogDescription,
      type: "website",
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        <div className="grain-overlay" aria-hidden />
        <Nav locale={lang} messages={dict.nav} />
        <main className="relative flex-1">{children}</main>
        <Footer locale={lang} messages={dict.footer} />
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
