import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, MapPin, Phone } from "lucide-react";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { SHOP } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { formatDateTimeLabel } from "@/lib/availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "You're booked" };

type SearchParams = Promise<{ id?: string }>;

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { id } = await searchParams;
  if (!id) redirect("/");

  const supabase = createSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      `id, customer_name, starts_at, ends_at, barbers ( name, slug ), services ( name, duration_minutes, price_cents )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!appt) redirect("/");

  const barber = Array.isArray(appt.barbers) ? appt.barbers[0] : appt.barbers;
  const service = Array.isArray(appt.services) ? appt.services[0] : appt.services;

  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${SHOP.name} — ${service?.name ?? ""}`,
  )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(
    `Appointment with ${barber?.name ?? ""}.\n\n${SHOP.name}\n${SHOP.address}\n${formatPhone(SHOP.phoneE164)}`,
  )}&location=${encodeURIComponent(SHOP.address)}`;

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16 md:px-10 md:py-24">
      <span className="eyebrow">Confirmed</span>
      <h1 className="mt-4 font-display text-[clamp(3rem,9vw,7rem)] leading-[0.88] tracking-[-0.02em]">
        See you,
        <br />
        <span className="italic-display text-copper">{appt.customer_name}</span>.
      </h1>
      <p className="mt-6 max-w-md text-base text-foreground/85 md:text-lg">
        You&apos;re on the books. A confirmation is on its way to your inbox.
      </p>

      <hr className="hairline mt-12" />

      <dl className="mt-10 grid grid-cols-1 gap-y-6 sm:grid-cols-[160px_1fr]">
        <dt className="eyebrow">When</dt>
        <dd className="font-display text-2xl md:text-3xl">
          {formatDateTimeLabel(appt.starts_at)}
        </dd>
        <dt className="eyebrow">Barber</dt>
        <dd className="font-display text-2xl md:text-3xl">{barber?.name}</dd>
        <dt className="eyebrow">Service</dt>
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
            <dt className="eyebrow">Price</dt>
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
          Add to calendar
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.address)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.22em] hover:border-foreground"
        >
          <MapPin className="h-4 w-4" />
          Directions
        </a>
        <a
          href={`tel:${SHOP.phoneE164}`}
          className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.22em] hover:border-foreground"
        >
          <Phone className="h-4 w-4" />
          Call shop
        </a>
      </div>

      <p className="mt-16 text-sm text-muted-foreground">
        Need to change or cancel?{" "}
        <Link href="/my-bookings" className="editorial-link font-medium text-foreground">
          Manage your bookings
        </Link>
        .
      </p>
    </div>
  );
}
