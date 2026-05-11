import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, MapPin, Phone } from "lucide-react";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { SHOP } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { formatDateTimeLabel } from "@/lib/availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isLocale, localePath, tt } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).book.metaSuccess };
}

type SearchParams = Promise<{ id?: string }>;

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: SearchParams;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).success;

  const { id } = await searchParams;
  if (!id) redirect(localePath(lang, "/"));

  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      `id, customer_name, starts_at, ends_at, barbers ( name, slug ), services ( name, duration_minutes, price_cents )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!appt) redirect(localePath(lang, "/"));

  const barber = Array.isArray(appt.barbers) ? appt.barbers[0] : appt.barbers;
  const service = Array.isArray(appt.services) ? appt.services[0] : appt.services;

  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    tt(t.calendarTitle, { shop: SHOP.name, service: service?.name ?? "" }),
  )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(
    tt(t.calendarDetails, {
      name: barber?.name ?? "",
      shop: SHOP.name,
      address: SHOP.address,
      phone: formatPhone(SHOP.phoneE164),
    }),
  )}&location=${encodeURIComponent(SHOP.address)}`;

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16 md:px-10 md:py-24">
      <span className="eyebrow">{t.confirmed}</span>
      <h1 className="mt-4 font-display text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-[-0.02em]">
        {t.seeYou}
        <br />
        <span className="italic-display text-copper">{appt.customer_name}</span>.
      </h1>
      <p className="mt-6 max-w-md text-base text-foreground/85 md:text-lg">
        {t.onTheBooks}
      </p>

      <hr className="hairline mt-12" />

      <dl className="mt-10 grid grid-cols-1 gap-y-6 sm:grid-cols-[160px_1fr]">
        <dt className="eyebrow">{t.when}</dt>
        <dd className="font-display text-2xl md:text-3xl">
          {formatDateTimeLabel(appt.starts_at, lang)}
        </dd>
        <dt className="eyebrow">{t.barber}</dt>
        <dd className="font-display text-2xl md:text-3xl">{barber?.name}</dd>
        <dt className="eyebrow">{t.service}</dt>
        <dd className="font-display text-2xl md:text-3xl">
          {service?.name}{" "}
          {service && (
            <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDurationMinutes(service.duration_minutes)}
            </span>
          )}
        </dd>
        {service && (
          <>
            <dt className="eyebrow">{t.price}</dt>
            <dd className="num text-2xl md:text-3xl">
              {formatPriceCents(service.price_cents)}
            </dd>
          </>
        )}
      </dl>

      <div className="mt-14 flex flex-wrap gap-3">
        <a
          href={calUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-3 text-xs uppercase tracking-[0.22em] text-background hover:bg-copper"
        >
          <Calendar className="h-4 w-4" />
          {t.addToCalendar}
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.address)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.22em] hover:border-foreground"
        >
          <MapPin className="h-4 w-4" />
          {t.directions}
        </a>
        <a
          href={`tel:${SHOP.phoneE164}`}
          className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.22em] hover:border-foreground"
        >
          <Phone className="h-4 w-4" />
          {t.callShop}
        </a>
      </div>

      <p className="mt-16 text-sm text-muted-foreground">
        {t.needToChange}{" "}
        <Link
          href={localePath(lang, "/my-bookings")}
          className="editorial-link font-medium text-foreground"
        >
          {t.manageBookings}
        </Link>
        .
      </p>
    </div>
  );
}
