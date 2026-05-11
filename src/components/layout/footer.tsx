import Link from "next/link";
import { SHOP } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { InstagramIcon } from "@/components/icons";
import { Marquee } from "@/components/marquee";

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-border">
      <div className="border-b border-border">
        <Marquee
          items={[
            "Amazing Hair Design",
            "Westminster, CA",
            "Walk-ins Welcome",
            "Est. — Tommy",
            "Fades · Shaves · Beard Work",
            "Book Online",
          ]}
        />
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
              A barbershop on Bolsa. Open six days a week. Same chair, same
              hands, fresh every time.
            </p>
          </div>

          {/* Visit */}
          <div className="space-y-3 text-sm">
            <p className="eyebrow">Visit</p>
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
            <p className="eyebrow">Pages</p>
            <ul className="space-y-1.5">
              {[
                { href: "/services", label: "Services" },
                { href: "/gallery", label: "Gallery" },
                { href: "/contact", label: "Visit" },
                { href: "/my-bookings", label: "My bookings" },
                { href: "/book", label: "Book online" },
              ].map((l) => (
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
            <p className="eyebrow">Elsewhere</p>
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
          <span>© {new Date().getFullYear()} {SHOP.name}</span>
          <span>Designed for the chair — built for the phone.</span>
        </div>
      </div>
    </footer>
  );
}
