import { Phone, MapPin, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { InstagramIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { SHOP } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { getShopHours } from "@/lib/queries";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).contact.meta };
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

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).contact;

  const hours = await getShopHours();

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-32">
      <Reveal>
        <span className="eyebrow">{t.eyebrow}</span>
        <h1 className="mt-6 font-display text-[clamp(3rem,10vw,8rem)] leading-[0.88] tracking-[-0.02em]">
          {t.title1}
          <br />
          <span className="italic-display text-copper">{t.title2}</span> {t.title3}
        </h1>
        <p className="mt-6 max-w-md text-base text-foreground/85 md:text-lg">
          {t.blurb}
        </p>
      </Reveal>

      <hr className="hairline mt-16" />

      <div className="mt-12 grid gap-12 md:grid-cols-5">
        <Reveal className="md:col-span-3">
          <div className="aspect-[4/3] w-full overflow-hidden border border-border">
            <iframe
              src={SHOP.gmapsEmbed}
              width="100%"
              height="100%"
              style={{
                border: 0,
                filter: "grayscale(1) invert(0.92) contrast(0.85)",
              }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map"
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`tel:${SHOP.phoneE164}`}
              className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-3 text-xs uppercase tracking-[0.22em] text-background hover:bg-copper"
            >
              <Phone className="h-4 w-4" />
              {formatPhone(SHOP.phoneE164)}
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.22em] hover:border-foreground"
            >
              {t.directions}
            </a>
            <a
              href={SHOP.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.22em] hover:border-foreground"
            >
              <InstagramIcon className="h-4 w-4" />
              {t.instagram}
            </a>
          </div>
        </Reveal>

        <Reveal delay={120} className="md:col-span-2">
          <div className="space-y-10">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> {t.address}
              </p>
              <p className="mt-3 text-lg">{SHOP.address}</p>
            </div>

            <div>
              <p className="eyebrow flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> {t.hours}
              </p>
              <ul className="mt-3 divide-y divide-border">
                {hours.map((h) => (
                  <li
                    key={h.day_of_week}
                    className="flex items-baseline justify-between py-3"
                  >
                    <span className="font-display text-xl">
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
            </div>

            <div>
              <p className="eyebrow">{t.walkInPolicy}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.walkInBlurb}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
