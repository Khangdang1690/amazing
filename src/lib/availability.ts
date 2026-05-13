import { addMinutes } from "date-fns";
import { vi as viLocale, enUS } from "date-fns/locale";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { Locale as AppLocale } from "@/i18n/config";

const dateFnsLocale = { vi: viLocale, en: enUS } as const;

const SLOT_GRID_MINUTES = 15;

export type Slot = {
  /** ISO string with timezone offset (UTC instant). */
  startsAt: string;
  /** Human-readable display like "9:00 AM" in shop TZ. */
  label: string;
};

/**
 * Generate bookable slots for one barber on one calendar date (in shop TZ).
 * A slot is taken iff there's already a non-cancelled appointment at that
 * exact start time for this barber. Service duration is no longer the
 * customer's responsibility - staff records the actual end at serve time.
 */
export async function getAvailableSlots(args: {
  barberId: string;
  /** YYYY-MM-DD in shop timezone */
  dateISO: string;
}): Promise<Slot[]> {
  const { barberId, dateISO } = args;
  const tz = env.shopTimezone;

  const dayStartUTC = fromZonedTime(`${dateISO}T00:00:00`, tz);
  const dayEndUTC = fromZonedTime(`${dateISO}T23:59:59.999`, tz);

  const zonedNoon = toZonedTime(
    fromZonedTime(`${dateISO}T12:00:00`, tz),
    tz,
  );
  const realDayOfWeek = zonedNoon.getDay(); // 0..6, Sun=0

  const supabase = createSupabaseAdminClient();

  const { data: hoursRows } = await supabase
    .from("shop_hours")
    .select("*")
    .eq("day_of_week", realDayOfWeek)
    .limit(1);

  const hours = hoursRows?.[0];
  if (!hours || hours.closed || !hours.open_time || !hours.close_time) {
    return [];
  }

  const openUTC = fromZonedTime(`${dateISO}T${hours.open_time}`, tz);
  const closeUTC = fromZonedTime(`${dateISO}T${hours.close_time}`, tz);

  const { data: appts } = await supabase
    .from("appointments")
    .select("starts_at, status")
    .eq("barber_id", barberId)
    .not("status", "in", "(cancelled,walkin)")
    .gte("starts_at", dayStartUTC.toISOString())
    .lte("starts_at", dayEndUTC.toISOString());

  const { data: offs } = await supabase
    .from("time_off")
    .select("starts_at, ends_at, barber_id")
    .or(`barber_id.eq.${barberId},barber_id.is.null`)
    .lt("starts_at", dayEndUTC.toISOString())
    .gt("ends_at", dayStartUTC.toISOString());

  // Slot is taken iff some non-cancelled appointment has exactly this start.
  const taken = new Set(
    (appts ?? []).map((a) => new Date(a.starts_at).getTime()),
  );
  const offRanges = (offs ?? []).map((o) => ({
    start: new Date(o.starts_at).getTime(),
    end: new Date(o.ends_at).getTime(),
  }));

  const slots: Slot[] = [];
  const now = new Date();
  let cursor = openUTC;

  while (cursor.getTime() < closeUTC.getTime()) {
    const t = cursor.getTime();
    const inPast = t <= now.getTime();
    const inTimeOff = offRanges.some((r) => t >= r.start && t < r.end);

    if (!taken.has(t) && !inPast && !inTimeOff) {
      slots.push({
        startsAt: cursor.toISOString(),
        label: formatInTimeZone(cursor, tz, "h:mm a"),
      });
    }

    cursor = addMinutes(cursor, SLOT_GRID_MINUTES);
  }

  return slots;
}

/** Today's date as YYYY-MM-DD in shop TZ. */
export function todayInShopTz(): string {
  return formatInTimeZone(new Date(), env.shopTimezone, "yyyy-MM-dd");
}

/** Add N days to a YYYY-MM-DD date (calendar add, TZ-safe). */
export function addDaysISO(dateISO: string, days: number): string {
  const tz = env.shopTimezone;
  const noon = fromZonedTime(`${dateISO}T12:00:00`, tz);
  noon.setUTCDate(noon.getUTCDate() + days);
  return formatInTimeZone(noon, tz, "yyyy-MM-dd");
}

/** Pretty date like "Tue, May 14" / "T3, 14 thg 5". */
export function formatDateLabel(dateISO: string, locale: AppLocale = "en"): string {
  const tz = env.shopTimezone;
  const noon = fromZonedTime(`${dateISO}T12:00:00`, tz);
  return formatInTimeZone(noon, tz, "EEE, MMM d", {
    locale: dateFnsLocale[locale],
  });
}

/** Pretty date+time like "Tue, May 14 at 2:30 PM" / "T3, 14 thg 5 lúc 14:30". */
export function formatDateTimeLabel(
  isoUTC: string,
  locale: AppLocale = "en",
): string {
  const pattern =
    locale === "vi" ? "EEE, d MMM 'lúc' HH:mm" : "EEE, MMM d 'at' h:mm a";
  return formatInTimeZone(new Date(isoUTC), env.shopTimezone, pattern, {
    locale: dateFnsLocale[locale],
  });
}

/** Day-of-week index (0=Sun..6=Sat) in shop TZ for a YYYY-MM-DD. */
export function dayOfWeekInShopTz(dateISO: string): number {
  const tz = env.shopTimezone;
  const zonedNoon = toZonedTime(fromZonedTime(`${dateISO}T12:00:00`, tz), tz);
  return zonedNoon.getDay();
}
