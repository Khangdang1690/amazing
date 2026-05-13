import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getBarberBySlugLocalized,
  getServicesForBarber,
} from "@/lib/queries";
import {
  getAvailableSlots,
  todayInShopTz,
  addDaysISO,
  formatDateLabel,
  dayOfWeekInShopTz,
} from "@/lib/availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isLocale, localePath, tt } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { BookingPicker } from "./booking-picker";

type SearchParams = Promise<{ date?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; barberSlug: string }>;
}) {
  const { lang, barberSlug } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang).book;
  const barber = await getBarberBySlugLocalized(barberSlug, lang);
  return {
    title: barber ? tt(t.metaBarber, { name: barber.name }) : t.metaBarberFallback,
  };
}

export default async function BookBarberPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; barberSlug: string }>;
  searchParams: SearchParams;
}) {
  const { lang, barberSlug } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).book;

  const { date: dateQuery } = await searchParams;

  const barber = await getBarberBySlugLocalized(barberSlug, lang);
  if (!barber) notFound();

  // Gate: a barber with no active services is not configured to take work.
  const offered = await getServicesForBarber(barber.id);
  if (offered.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">
          {tt(t.notTakingBookings, { name: barber.name })}
        </h1>
        <Link
          href={localePath(lang, "/book")}
          className="editorial-link mt-6 inline-block text-sm uppercase tracking-[0.18em]"
        >
          {t.pickDifferentBarber}
        </Link>
      </div>
    );
  }

  const today = todayInShopTz();
  const selectedDate = dateQuery ?? today;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysISO(today, i);
    return {
      iso: d,
      label: formatDateLabel(d, lang),
      isSelected: d === selectedDate,
    };
  });

  const slots = await getAvailableSlots({
    barberId: barber.id,
    dateISO: selectedDate,
  });

  const dayOfWeek = dayOfWeekInShopTz(selectedDate);
  const supabase = createSupabaseAdminClient();
  const { data: hoursRow } = await supabase
    .from("shop_hours")
    .select("closed")
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();
  const closed = hoursRow?.closed ?? false;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-10 md:py-16">
      <Link
        href={localePath(lang, "/book")}
        className="inline-flex items-center text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t.differentBarber}
      </Link>

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <span className="eyebrow">{t.step2}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {tt(t.withBarber, { name: barber.name })}
        </span>
      </div>

      <h1 className="mt-4 font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.9] tracking-[-0.02em]">
        {t.booking}{" "}
        <span className="italic-display text-copper">{barber.name}</span>.
      </h1>

      <BookingPicker
        locale={lang}
        barberSlug={barber.slug}
        barberId={barber.id}
        days={days}
        selectedDate={selectedDate}
        slots={slots}
        closed={closed}
        messages={{
          date: t.date,
          shopLocalTime: t.shopLocalTime,
          time: t.time,
          openings: t.openings,
          closedToday: t.closedToday,
          noOpenings: t.noOpenings,
        }}
      />
    </div>
  );
}
