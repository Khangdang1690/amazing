import { cookies } from "next/headers";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTimeLabel } from "@/lib/availability";
import { formatPhone } from "@/lib/phone";
import { OtpForm } from "./otp-form";
import { SignOutButton } from "./sign-out";

export const metadata = { title: "My bookings" };

export default async function MyBookingsPage() {
  const cookieStore = await cookies();
  const phone = cookieStore.get("mb_phone")?.value;

  if (!phone) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-16 md:px-10 md:py-24">
        <span className="eyebrow">{`/access`}</span>
        <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] leading-[0.88] tracking-[-0.02em]">
          Your <span className="italic-display text-copper">chair</span>.
        </h1>
        <p className="mt-6 max-w-md text-base text-foreground/85 md:text-lg">
          Enter the phone you booked with. We&apos;ll email a 6-digit code to
          verify it&apos;s you.
        </p>
        <div className="mt-10 border border-border bg-card p-6">
          <OtpForm />
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

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16 md:px-10 md:py-24">
      <div className="flex items-baseline justify-between gap-4">
        <span className="eyebrow">{`/your visits`}</span>
        <SignOutButton />
      </div>

      <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] leading-[0.88] tracking-[-0.02em]">
        Your <span className="italic-display text-copper">visits</span>.
      </h1>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Signed in as {formatPhone(phone)}
      </p>

      <hr className="hairline mt-12" />

      <section className="mt-12">
        <p className="eyebrow">Upcoming</p>
        {upcoming.length === 0 ? (
          <div className="mt-4 border border-dashed border-border p-10 text-sm text-muted-foreground">
            No upcoming appointments.{" "}
            <Link href="/book" className="editorial-link text-foreground">
              Book one →
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
                    {formatDateTimeLabel(a.starts_at)}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {a.service?.name} · {a.barber?.name}
                  </div>
                </div>
                <span className="border border-copper px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-copper">
                  Confirmed
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <p className="eyebrow">Past — one-tap rebook</p>
        {past.length === 0 ? (
          <div className="mt-4 border border-dashed border-border p-10 text-sm text-muted-foreground">
            No past visits yet.
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
                    {formatDateTimeLabel(a.starts_at)}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {a.service?.name} · {a.barber?.name} ·{" "}
                    {a.status === "completed"
                      ? "Completed"
                      : a.status === "cancelled"
                        ? "Cancelled"
                        : a.status === "no_show"
                          ? "No-show"
                          : "Past"}
                  </div>
                </div>
                {a.barber?.slug && a.service?.id && (
                  <Link
                    href={`/book/${a.barber.slug}?service=${a.service.id}`}
                    className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[11px] uppercase tracking-[0.18em] hover:border-foreground"
                  >
                    Rebook → {a.barber.name}
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
