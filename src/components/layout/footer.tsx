import Link from "next/link";
import { SHOP } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { InstagramIcon } from "@/components/icons";
import { Marquee } from "@/components/marquee";
import { type Locale, localePath, tt } from "@/i18n/config";

type FooterMessages = {
  marquee: string[];
  wordmarkBlurb: string;
  visit: string;
  pages: string;
  elsewhere: string;
  services: string;
  gallery: string;
  visitLink: string;
  myBookings: string;
  bookOnline: string;
  tagline: string;
  copyright: string;
};

type Props = {
  locale: Locale;
  messages: FooterMessages;
};

export function Footer({ locale, messages }: Props) {
  const sitemap = [
    { href: localePath(locale, "/services"), label: messages.services },
    { href: localePath(locale, "/gallery"), label: messages.gallery },
    { href: localePath(locale, "/contact"), label: messages.visitLink },
    { href: localePath(locale, "/my-bookings"), label: messages.myBookings },
    { href: localePath(locale, "/book"), label: messages.bookOnline },
  ];

  return (
    <footer className="relative mt-32 border-t border-border">
      <div className="border-b border-border">
        <Marquee items={messages.marquee} />
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Wordmark */}
          <div>
            <h2 className="font-display text-5xl leading-[0.95] md:text-7xl">
              Amazing
              <span className="italic-display block text-copper">Hair</span>
              Design.
            </h2>
            <p className="mt-6 max-w-xs text-sm text-muted-foreground">
              {messages.wordmarkBlurb}
            </p>
          </div>

          {/* Visit */}
          <div className="space-y-3 text-sm">
            <p className="eyebrow">{messages.visit}</p>
            <p className="leading-relaxed">{SHOP.address}</p>
            <a
              href={`tel:${SHOP.phoneE164}`}
              className="block font-mono text-foreground hover:text-copper"
            >
              {formatPhone(SHOP.phoneE164)}
            </a>
          </div>

          {/* Sitemap */}
          <div className="space-y-3 text-sm">
            <p className="eyebrow">{messages.pages}</p>
            <ul className="space-y-1.5">
              {sitemap.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="editorial-link inline-block text-foreground/85 hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-3 text-sm">
            <p className="eyebrow">{messages.elsewhere}</p>
            <a
              href={SHOP.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-copper"
            >
              <InstagramIcon className="h-4 w-4" />
              @{SHOP.instagramHandle}
            </a>
          </div>
        </div>

        <hr className="hairline my-10" />

        <div className="flex flex-wrap items-end justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            {tt(messages.copyright, {
              year: new Date().getFullYear(),
              shop: SHOP.name,
            })}
          </span>
          <span>{messages.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
