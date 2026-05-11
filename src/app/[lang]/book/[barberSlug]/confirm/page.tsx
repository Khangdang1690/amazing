import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBarberBySlug } from "@/lib/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeLabel } from "@/lib/availability";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ConfirmForm } from "./confirm-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).book.metaConfirm };
}

type SearchParams = Promise<{ service?: string; startsAt?: string }>;

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; barberSlug: string }>;
  searchParams: SearchParams;
}) {
  const { lang, barberSlug } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).book;

  const { service: serviceId, startsAt } = await searchParams;

  const barber = await getBarberBySlug(barberSlug);
  if (!barber) notFound();

  if (!serviceId || !startsAt) {
    redirect(localePath(lang, `/book/${barberSlug}`));
  }

  const supabase = createSupabaseAdminClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, active")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service || !service.active) {
    redirect(localePath(lang, `/book/${barberSlug}`));
  }

  const startDate = new Date(startsAt);
  const nowMs = new Date().getTime();
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() < nowMs) {
    redirect(localePath(lang, `/book/${barberSlug}`));
  }

  return (
    <div className="mx-auto max-w-[800px] px-6 py-12 md:px-10 md:py-16">
      <Link
        href={`${localePath(lang, `/book/${barber.slug}`)}?service=${service.id}`}
        className="inline-flex items-center text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t.differentTime}
      </Link>

      <span className="mt-8 block eyebrow">{t.step3}</span>
      <h1 className="mt-4 font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.9] tracking-[-0.02em]">
        {t.title3Line1}
        <br />
        <span className="italic-display text-copper">{t.title3Line2}</span>.
      </h1>

      <div className="mt-10 border border-border bg-card p-6">
        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
          <dt className="eyebrow">{t.when}</dt>
          <dd className="font-display text-lg">
            {formatDateTimeLabel(startsAt, lang)}
          </dd>
          <dt className="eyebrow">{t.barberLabel}</dt>
          <dd className="font-display text-lg">{barber.name}</dd>
          <dt className="eyebrow">{t.serviceLabel}</dt>
          <dd className="font-display text-lg">
            {service.name}{" "}
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {formatDurationMinutes(service.duration_minutes)}
            </span>
          </dd>
          <dt className="eyebrow">{t.priceLabel}</dt>
          <dd className="num text-lg">
            {formatPriceCents(service.price_cents)}
          </dd>
        </dl>
      </div>

      <ConfirmForm
        barberId={barber.id}
        serviceId={service.id}
        startsAt={startsAt}
        locale={lang}
        messages={{
          yourName: t.yourName,
          namePlaceholder: t.namePlaceholder,
          phoneLabel: t.phoneLabel,
          phonePlaceholder: t.phonePlaceholder,
          emailLabel: t.emailLabel,
          emailPlaceholder: t.emailPlaceholder,
          notesLabel: t.notesLabel,
          notesPlaceholder: t.notesPlaceholder,
          booking: t.booking_,
          lockItIn: t.lockItIn,
          confirmationNote: t.confirmationNote,
        }}
      />
    </div>
  );
}
