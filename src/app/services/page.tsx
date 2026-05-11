import Link from "next/link";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { getActiveServices } from "@/lib/queries";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Services & Pricing",
};

export default async function ServicesPage() {
  const services = await getActiveServices();

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-20 md:px-10 md:py-32">
      <div className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">The menu</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {services.length} services
        </span>
      </div>

      <h1 className="mt-6 font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.9] tracking-[-0.02em]">
        Services
        <span className="italic-display text-copper"> &amp; </span>
        prices.
      </h1>

      <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
        Cash and card both accepted. Tips appreciated, never required.
        Prices are flat — what you see is what you pay.
      </p>

      <hr className="hairline mt-16" />

      <ul className="divide-y divide-border">
        {services.map((s, i) => (
          <Reveal key={s.id} delay={i * 60}>
            <li className="menu-row items-baseline py-8 md:py-10">
              <span className="num text-sm text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-3xl md:text-5xl">
                    {s.name}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {formatDurationMinutes(s.duration_minutes)}
                  </span>
                </div>
                {s.description && (
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {s.description}
                  </p>
                )}
              </div>
              <span className="num text-3xl md:text-4xl">
                {formatPriceCents(s.price_cents)}
              </span>
            </li>
          </Reveal>
        ))}
      </ul>

      <div className="mt-20 flex flex-col items-start gap-6 border-t border-border pt-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">Ready?</p>
          <h2 className="mt-2 text-4xl md:text-5xl">
            Pick a chair.
          </h2>
        </div>
        <Link
          href="/book"
          className="inline-flex items-center gap-3 border border-foreground bg-foreground px-7 py-4 text-xs uppercase tracking-[0.22em] text-background transition-colors hover:bg-copper"
        >
          Book online
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
