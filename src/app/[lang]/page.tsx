import Link from "next/link";
import Image from "next/image";
import { Phone, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { InstagramIcon } from "@/components/icons";
import { Marquee } from "@/components/marquee";
import { Reveal } from "@/components/reveal";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { SHOP } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import {
  getActiveBarbersLocalized,
  getActiveServicesLocalized,
  getGalleryPhotosLocalized,
  getShopHours,
  publicPhotoUrl,
} from "@/lib/queries";
import { isLocale, localePath, tt } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.home;

  const [barbers, services, photos, hours] = await Promise.all([
    getActiveBarbersLocalized(lang),
    getActiveServicesLocalized(lang),
    getGalleryPhotosLocalized(lang),
    getShopHours(),
  ]);

  const featuredServices = services.slice(0, 6);
  const featuredPhotos = photos.slice(0, 5);

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 hero-glow" aria-hidden />

        <div className="mx-auto max-w-[1400px] px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-24">
          <div className="grid grid-cols-12 gap-y-6">
            <div className="col-span-12 flex items-baseline justify-between gap-4 md:col-span-12">
              <span className="eyebrow">{t.eyebrow1}</span>
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
                {SHOP.address.split(",").slice(-2).join(", ").trim()}
              </span>
            </div>

            {/* Big asymmetric wordmark */}
            <h1 className="col-span-12 mt-6 font-display leading-[0.85] tracking-[-0.02em]">
              <span className="block text-[clamp(3.5rem,11vw,11rem)]">
                {t.title1}
              </span>
              <span className="block translate-x-[6vw] text-[clamp(3.5rem,11vw,11rem)] italic-display text-copper">
                {t.title2}
              </span>
              <span className="block text-[clamp(3.5rem,11vw,11rem)]">
                {t.title3}
              </span>
            </h1>

            <p className="col-span-12 mt-10 max-w-md text-base text-foreground/85 md:col-start-7 md:max-w-lg md:text-lg">
              {t.intro}
            </p>

            <div className="col-span-12 mt-8 flex flex-wrap items-center gap-4 md:col-start-7">
              <Link
                href={localePath(lang, "/book")}
                className="group inline-flex items-center gap-3 border border-foreground bg-foreground px-7 py-4 text-xs uppercase tracking-[0.22em] text-background hover:bg-copper"
              >
                {t.bookOnline}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a
                href={`tel:${SHOP.phoneE164}`}
                className="inline-flex items-center gap-3 border border-border px-7 py-4 text-xs uppercase tracking-[0.22em] hover:border-foreground"
              >
                <Phone className="h-4 w-4" />
                {t.call} {formatPhone(SHOP.phoneE164)}
              </a>
            </div>
          </div>
        </div>

        {/* Marquee strip */}
        <div className="border-y border-border">
          <Marquee items={t.marquee} />
        </div>
      </section>

      {/* ========================== THE MENU ========================== */}
      <section className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <Reveal>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <p className="eyebrow">{t.menuEyebrow}</p>
              <h2 className="mt-6 text-5xl leading-[0.95] md:text-6xl">
                {t.menuTitle1}
                <br />
                <span className="italic-display text-copper">{t.menuTitle2}</span>
                {t.menuTitle3}
              </h2>
              <p className="mt-6 max-w-xs text-sm text-muted-foreground">
                {t.menuBlurb}
              </p>
              <Link
                href={localePath(lang, "/services")}
                className="editorial-link mt-8 inline-block text-sm uppercase tracking-[0.18em]"
              >
                {t.seeFullMenu}
              </Link>
            </div>

            <div className="col-span-12 md:col-span-8 md:pl-10">
              <ul className="divide-y divide-border">
                {featuredServices.map((s, i) => (
                  <li key={s.id} className="menu-row py-6">
                    <span className="num text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="font-display text-2xl md:text-3xl">
                        {s.name}
                      </span>
                      <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {formatDurationMinutes(s.duration_minutes)}
                      </span>
                    </div>
                    <span className="num text-2xl md:text-3xl">
                      {formatPriceCents(s.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ========================== THE BARBERS ========================== */}
      {barbers.length > 0 && (
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
            <Reveal>
              <div className="flex items-baseline justify-between gap-4">
                <p className="eyebrow">{t.barbersEyebrow}</p>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {tt(
                    barbers.length === 1 ? t.barbersCount : t.barbersCountPlural,
                    { count: barbers.length },
                  )}
                </span>
              </div>
              <h2 className="mt-4 text-5xl leading-[0.95] md:text-7xl">
                {t.barbersTitle1}{" "}
                <span className="italic-display text-copper">{t.barbersTitle2}</span>.
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-px bg-border md:grid-cols-3">
              {barbers.map((b, i) => (
                <Reveal key={b.id} delay={i * 80}>
                  <div className="flex h-full flex-col bg-background p-8 transition-colors hover:bg-card">
                    <div className="flex items-baseline justify-between">
                      <span className="num text-xs text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="eyebrow">{t.barber}</span>
                    </div>
                    <h3 className="mt-6 text-5xl">{b.name}</h3>
                    {b.bio && (
                      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                        {b.bio}
                      </p>
                    )}
                    <Link
                      href={localePath(lang, `/book/${b.slug}`)}
                      className="editorial-link mt-auto inline-block pt-10 text-sm uppercase tracking-[0.18em]"
                    >
                      {tt(t.bookBarber, { name: b.name })}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================== THE WORK ========================== */}
      <section className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">{t.workEyebrow}</p>
              <h2 className="mt-4 text-5xl leading-[0.95] md:text-7xl">
                {t.workTitle1}
                <br />
                <span className="italic-display text-copper">{t.workTitle2}</span>.
              </h2>
            </div>
            <a
              href={SHOP.instagram}
              target="_blank"
              rel="noreferrer"
              className="editorial-link inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em]"
            >
              <InstagramIcon className="h-4 w-4" />
              @{SHOP.instagramHandle}
            </a>
          </div>
        </Reveal>

        {featuredPhotos.length > 0 ? (
          <div className="mt-14 grid grid-cols-6 gap-3 md:gap-5">
            {featuredPhotos.slice(0, 5).map((p, i) => {
              // Editorial-style asymmetric layout
              const layouts = [
                "col-span-4 aspect-[4/5] row-span-2",
                "col-span-2 aspect-square",
                "col-span-2 aspect-[3/4]",
                "col-span-3 aspect-video",
                "col-span-3 aspect-video",
              ];
              return (
                <Reveal key={p.id} delay={i * 60} className={layouts[i] ?? "col-span-3 aspect-square"}>
                  <div className="relative h-full w-full overflow-hidden bg-muted">
                    <Image
                      src={publicPhotoUrl(p.storage_path)}
                      alt={p.caption ?? t.recentWorkAlt}
                      fill
                      className="object-cover transition-transform duration-1000 hover:scale-[1.04]"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                    />
                  </div>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <Reveal>
            <div className="mt-14 flex flex-col items-center justify-center border border-dashed border-border py-20 text-center">
              <InstagramIcon className="h-12 w-12 text-muted-foreground" />
              <p className="mt-6 max-w-md text-muted-foreground">
                {t.galleryComingTitle}
              </p>
              <a
                href={SHOP.instagram}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 border border-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
              >
                <InstagramIcon className="h-4 w-4" />
                {tt(t.followIg, { handle: SHOP.instagramHandle })}
              </a>
            </div>
          </Reveal>
        )}
      </section>

      {/* ========================== VISIT ========================== */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid gap-12 md:grid-cols-[1.2fr_1fr]">
            <Reveal>
              <div>
                <p className="eyebrow">{t.visitEyebrow}</p>
                <h2 className="mt-4 text-5xl leading-[0.95] md:text-7xl">
                  {t.visitTitle1}
                  <br />
                  <span className="italic-display text-copper">{t.visitTitle2}</span>.
                </h2>
                <p className="mt-6 flex items-start gap-3 text-foreground/85">
                  <MapPin className="mt-1 h-5 w-5 shrink-0" />
                  <span>{SHOP.address}</span>
                </p>

                <div className="mt-8 aspect-[4/3] w-full overflow-hidden border border-border">
                  <iframe
                    src={SHOP.gmapsEmbed}
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: "grayscale(1) invert(0.92) contrast(0.85)" }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Map"
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                  <a
                    href={`tel:${SHOP.phoneE164}`}
                    className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background hover:bg-copper"
                  >
                    <Phone className="h-4 w-4" />
                    {formatPhone(SHOP.phoneE164)}
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
                  >
                    {t.directions}
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div>
                <p className="eyebrow">{t.hours}</p>
                <ul className="mt-4 divide-y divide-border">
                  {hours.map((h) => (
                    <li
                      key={h.day_of_week}
                      className="flex items-baseline justify-between py-4"
                    >
                      <span className="font-display text-2xl">
                        {t.dayNames[h.day_of_week]}
                      </span>
                      <span className="num text-sm uppercase tracking-[0.15em] text-foreground/80">
                        {h.closed
                          ? t.closed
                          : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-10 text-sm text-muted-foreground">
                  {t.hoursBlurb}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return m === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
