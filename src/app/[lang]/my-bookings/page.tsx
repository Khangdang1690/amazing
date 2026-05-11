import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeLabel } from "@/lib/availability";
import { formatPhone } from "@/lib/phone";
import { isLocale, localePath, tt } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { OtpForm } from "./otp-form";
import { SignOutButton } from "./sign-out";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).myBookings.meta };
}

export default async function MyBookingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).myBookings;

  const cookieStore = await cookies();
  const phone = cookieStore.get("mb_phone")?.value;

  if (!phone) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-16 md:px-10 md:py-24">
        <span className="eyebrow">{t.accessEyebrow}</span>
        <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] leading-[0.88] tracking-[-0.02em]">
          {t.accessTitle1}{" "}
          <span className="italic-display text-copper">{t.accessTitle2}</span>.
        </h1>
        <p className="mt-6 max-w-md text-base text-foreground/85 md:text-lg">
          {t.accessBlurb}
        </p>
        <div className="mt-10 border border-border bg-card p-6">
          <OtpForm
            messages={{
              phoneLabel: t.phoneLabel,
              phonePlaceholder: t.phonePlaceholder,
              sending: t.sending,
              sendCode: t.sendCode,
              codeHint: t.codeHint,
              codeLabel: t.codeLabel,
              codePlaceholder: t.codePlaceholder,
              verifying: t.verifying,
              verifyAndContinue: t.verifyAndContinue,
              useDifferentNumber: t.useDifferentNumber,
            }}
          />
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: appts } = await supabase
    .from("appointments")
    .select(
      `id, starts_at, status, barbers ( name, slug ), services ( id, name, duration_minutes, price_cents )`,
    )
    .eq("customer_phone", phone)
    .order("starts_at", { ascending: false })
    .limit(20);

  const list = (appts ?? []).map((a) => ({
    id: a.id,
    starts_at: a.starts_at,
    status: a.status as "confirmed" | "completed" | "cancelled" | "no_show",
    barber: Array.isArray(a.barbers) ? a.barbers[0] : a.barbers,
    service: Array.isArray(a.services) ? a.services[0] : a.services,
  }));

  const nowMs = new Date().getTime();
  const upcoming = list.filter(
    (a) => a.status === "confirmed" && new Date(a.starts_at).getTime() > nowMs,
  );
  const past = list.filter((a) => !upcoming.includes(a));

  function statusLabel(s: "confirmed" | "completed" | "cancelled" | "no_show") {
    switch (s) {
      case "completed":
        return t.statusCompleted;
      case "cancelled":
        return t.statusCancelled;
      case "no_show":
        return t.statusNoShow;
      default:
        return t.statusPast;
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16 md:px-10 md:py-24">
      <div className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">{t.yourVisitsEyebrow}</span>
        <SignOutButton label={t.signOut} />
      </div>

      <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] leading-[0.88] tracking-[-0.02em]">
        {t.yourVisitsTitle1}{" "}
        <span className="italic-display text-copper">{t.yourVisitsTitle2}</span>.
      </h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {tt(t.signedInAs, { phone: formatPhone(phone) })}
      </p>

      <hr className="hairline mt-12" />

      <section className="mt-12">
        <p className="eyebrow">{t.upcoming}</p>
        {upcoming.length === 0 ? (
          <div className="mt-4 border border-dashed border-border p-10 text-sm text-muted-foreground">
            {t.noUpcoming}{" "}
            <Link
              href={localePath(lang, "/book")}
              className="editorial-link text-foreground"
            >
              {t.bookOne}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-3 py-5"
              >
                <div>
                  <div className="font-display text-2xl">
                    {formatDateTimeLabel(a.starts_at, lang)}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {a.service?.name} · {a.barber?.name}
                  </div>
                </div>
                <span className="border border-copper px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-copper">
                  {t.confirmed}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <p className="eyebrow">{t.pastEyebrow}</p>
        {past.length === 0 ? (
          <div className="mt-4 border border-dashed border-border p-10 text-sm text-muted-foreground">
            {t.noPast}
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {past.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-3 py-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl">
                    {formatDateTimeLabel(a.starts_at, lang)}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {a.service?.name} · {a.barber?.name} · {statusLabel(a.status)}
                  </div>
                </div>
                {a.barber?.slug && a.service?.id && (
                  <Link
                    href={`${localePath(lang, `/book/${a.barber.slug}`)}?service=${a.service.id}`}
                    className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[11px] uppercase tracking-[0.18em] hover:border-foreground"
                  >
                    {tt(t.rebookWith, { name: a.barber.name })}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
