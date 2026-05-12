import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { getActiveServicesLocalized } from "@/lib/queries";
import { Reveal } from "@/components/reveal";
import { isLocale, localePath, tt } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).services.meta };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).services;

  const services = await getActiveServicesLocalized(lang);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-20 md:px-10 md:py-32">
      <div className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">{t.eyebrow}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {tt(t.count, { count: services.length })}
        </span>
      </div>

      <h1 className="mt-6 font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.9] tracking-[-0.02em]">
        {t.title1}
        <span className="italic-display text-copper"> &amp; </span>
        {t.title3}
      </h1>

      <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
        {t.blurb}
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
          <p className="eyebrow">{t.readyEyebrow}</p>
          <h2 className="mt-2 text-4xl md:text-5xl">{t.pickAChair}</h2>
        </div>
        <Link
          href={localePath(lang, "/book")}
          className="inline-flex items-center gap-3 border border-foreground bg-foreground px-7 py-4 text-xs uppercase tracking-[0.22em] text-background transition-colors hover:bg-copper"
        >
          {t.bookOnline}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
