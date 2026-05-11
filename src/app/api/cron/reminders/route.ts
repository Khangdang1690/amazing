import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendBookingReminder } from "@/lib/email";
import { env } from "@/lib/env";

// Runs hourly (see vercel.json). Sends a reminder email to anyone whose
// appointment starts in the next ~24h and who hasn't been reminded yet.
export async function GET(request: NextRequest) {
  // Vercel cron sends a header `authorization: Bearer <CRON_SECRET>` when
  // CRON_SECRET is set. Also allow a `?secret=` for manual testing.
  const auth = request.headers.get("authorization");
  const urlSecret = request.nextUrl.searchParams.get("secret");
  if (env.cronSecret) {
    const ok =
      auth === `Bearer ${env.cronSecret}` || urlSecret === env.cronSecret;
    if (!ok) return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  const { data: appts, error } = await supabase
    .from("appointments")
    .select(
      `id, customer_name, customer_email, starts_at, reminder_sent_at, status,
       barbers ( name ), services ( name, duration_minutes, price_cents )`,
    )
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("starts_at", in23h.toISOString())
    .lte("starts_at", in25h.toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const a of appts ?? []) {
    const barber = Array.isArray(a.barbers) ? a.barbers[0] : a.barbers;
    const service = Array.isArray(a.services) ? a.services[0] : a.services;
    if (!barber || !service) continue;
    try {
      await sendBookingReminder({
        to: a.customer_email,
        customerName: a.customer_name,
        barberName: barber.name,
        serviceName: service.name,
        startsAt: a.starts_at,
        priceCents: service.price_cents,
        durationMinutes: service.duration_minutes,
      });
      await supabase
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", a.id);
      sent += 1;
    } catch (e) {
      console.error("[cron] reminder failed for", a.id, e);
    }
  }

  return NextResponse.json({ ok: true, considered: appts?.length ?? 0, sent });
}
