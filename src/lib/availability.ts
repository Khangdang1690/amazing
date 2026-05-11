import { addMinutes } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const SLOT_GRID_MINUTES = 15;

export type Slot = {
  /** ISO string with timezone offset (UTC instant). */
  startsAt: string;
  /** Human-readable display like "9:00 AM" in shop TZ. */
  label: string;
};

/**
 * Generate bookable slots for one barber on one calendar date (in shop TZ),
 * given a service duration. Excludes existing appointments and time-off.
 */
export async function getAvailableSlots(args: {
  barberId: string;
  /** YYYY-MM-DD in shop timezone */
  dateISO: string;
  serviceDurationMinutes: number;
}): Promise<Slot[]> {
  const { barberId, dateISO, serviceDurationMinutes } = args;
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
    .select("starts_at, ends_at, status")
    .eq("barber_id", barberId)
    .neq("status", "cancelled")
    .gte("starts_at", dayStartUTC.toISOString())
    .lte("starts_at", dayEndUTC.toISOString());

  const { data: offs } = await supabase
    .from("time_off")
    .select("starts_at, ends_at, barber_id")
    .or(`barber_id.eq.${barberId},barber_id.is.null`)
    .lt("starts_at", dayEndUTC.toISOString())
    .gt("ends_at", dayStartUTC.toISOString());

  const busy: Array<{ start: Date; end: Date }> = [
    ...(appts ?? []).map((a) => ({
      start: new Date(a.starts_at),
      end: new Date(a.ends_at),
    })),
    ...(offs ?? []).map((o) => ({
      start: new Date(o.starts_at),
      end: new Date(o.ends_at),
    })),
  ];

  const slots: Slot[] = [];
  const now = new Date();
  let cursor = openUTC;

  while (true) {
    const slotEnd = addMinutes(cursor, serviceDurationMinutes);
    if (slotEnd.getTime() > closeUTC.getTime()) break;

    const overlaps = busy.some((b) => cursor < b.end && slotEnd > b.start);
    const inPast = cursor.getTime() <= now.getTime();

    if (!overlaps && !inPast) {
      slots.push({
        startsAt: cursor.toISOString(),
        label: formatInTimeZone(cursor, tz, "h:mm a"),
      });
    }

    cursor = addMinutes(cursor, SLOT_GRID_MINUTES);
    if (cursor.getTime() >= closeUTC.getTime()) break;
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

/** Pretty date like "Tue, May 14". */
export function formatDateLabel(dateISO: string): string {
  const tz = env.shopTimezone;
  const noon = fromZonedTime(`${dateISO}T12:00:00`, tz);
  return formatInTimeZone(noon, tz, "EEE, MMM d");
}

/** Pretty date+time like "Tue, May 14 at 2:30 PM". */
export function formatDateTimeLabel(isoUTC: string): string {
  return formatInTimeZone(
    new Date(isoUTC),
    env.shopTimezone,
    "EEE, MMM d 'at' h:mm a",
  );
}

/** Day-of-week index (0=Sun..6=Sat) in shop TZ for a YYYY-MM-DD. */
export function dayOfWeekInShopTz(dateISO: string): number {
  const tz = env.shopTimezone;
  const zonedNoon = toZonedTime(fromZonedTime(`${dateISO}T12:00:00`, tz), tz);
  return zonedNoon.getDay();
}
