import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBarberBySlug, getServicesForBarber } from "@/lib/queries";
import {
  getAvailableSlots,
  todayInShopTz,
  addDaysISO,
  formatDateLabel,
  dayOfWeekInShopTz,
} from "@/lib/availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BookingPicker } from "./booking-picker";

type SearchParams = Promise<{ service?: string; date?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ barberSlug: string }>;
}) {
  const { barberSlug } = await params;
  const barber = await getBarberBySlug(barberSlug);
  return { title: barber ? `Book with ${barber.name}` : "Book" };
}

export default async function BookBarberPage({
  params,
  searchParams,
}: {
  params: Promise<{ barberSlug: string }>;
  searchParams: SearchParams;
}) {
  const { barberSlug } = await params;
  const { service: serviceQuery, date: dateQuery } = await searchParams;

  const barber = await getBarberBySlug(barberSlug);
  if (!barber) notFound();

  const services = await getServicesForBarber(barber.id);
  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">
          {barber.name} isn&apos;t taking bookings right now.
        </h1>
        <Link
          href="/book"
          className="editorial-link mt-6 inline-block text-sm uppercase tracking-[0.18em]"
        >
          Pick a different barber →
        </Link>
      </div>
    );
  }

  const selectedService =
    services.find((s) => s.id === serviceQuery) ?? services[0];

  const today = todayInShopTz();
  const selectedDate = dateQuery ?? today;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysISO(today, i);
    return {
      iso: d,
      label: formatDateLabel(d),
      isSelected: d === selectedDate,
    };
  });

  const slots = await getAvailableSlots({
    barberId: barber.id,
    dateISO: selectedDate,
    serviceDurationMinutes: selectedService.duration_minutes,
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
        href="/book"
        className="inline-flex items-center text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Different barber
      </Link>

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <span className="eyebrow">{`Step 02 / 03 — Pick a time`}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          with {barber.name}
        </span>
      </div>

      <h1 className="mt-4 font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.9] tracking-[-0.02em]">
        Booking{" "}
        <span className="italic-display text-copper">{barber.name}</span>.
      </h1>

      <BookingPicker
        barberSlug={barber.slug}
        barberId={barber.id}
        services={services}
        selectedServiceId={selectedService.id}
        days={days}
        selectedDate={selectedDate}
        slots={slots}
        closed={closed}
      />
    </div>
  );
}
