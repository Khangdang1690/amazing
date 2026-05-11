import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBarberBySlug } from "@/lib/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeLabel } from "@/lib/availability";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { ConfirmForm } from "./confirm-form";

export const metadata = { title: "Confirm your booking" };

type SearchParams = Promise<{ service?: string; startsAt?: string }>;

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ barberSlug: string }>;
  searchParams: SearchParams;
}) {
  const { barberSlug } = await params;
  const { service: serviceId, startsAt } = await searchParams;

  const barber = await getBarberBySlug(barberSlug);
  if (!barber) notFound();

  if (!serviceId || !startsAt) {
    redirect(`/book/${barberSlug}`);
  }

  const supabase = createSupabaseAdminClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, active")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service || !service.active) {
    redirect(`/book/${barberSlug}`);
  }

  const startDate = new Date(startsAt);
  const nowMs = new Date().getTime();
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() < nowMs) {
    redirect(`/book/${barberSlug}`);
  }

  return (
    <div className="mx-auto max-w-[800px] px-6 py-12 md:px-10 md:py-16">
      <Link
        href={`/book/${barber.slug}?service=${service.id}`}
        className="inline-flex items-center text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Different time
      </Link>

      <span className="mt-8 block eyebrow">Step 03 / 03 — Your details</span>
      <h1 className="mt-4 font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.9] tracking-[-0.02em]">
        Just three
        <br />
        <span className="italic-display text-copper">things</span>.
      </h1>

      <div className="mt-10 border border-border bg-card p-6">
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
          <dt className="eyebrow">When</dt>
          <dd className="font-display text-lg">
            {formatDateTimeLabel(startsAt)}
          </dd>
          <dt className="eyebrow">Barber</dt>
          <dd className="font-display text-lg">{barber.name}</dd>
          <dt className="eyebrow">Service</dt>
          <dd className="font-display text-lg">
            {service.name}{" "}
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDurationMinutes(service.duration_minutes)}
            </span>
          </dd>
          <dt className="eyebrow">Price</dt>
          <dd className="num text-lg">
            {formatPriceCents(service.price_cents)}
          </dd>
        </dl>
      </div>

      <ConfirmForm
        barberId={barber.id}
        serviceId={service.id}
        startsAt={startsAt}
      />
    </div>
  );
}
