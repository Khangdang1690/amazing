import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Barber,
  Service,
  ShopHours,
  GalleryPhoto,
} from "@/lib/types";
import type { Locale } from "@/i18n/config";

/**
 * Apply translations from `public.translations` to a list of rows.
 * Rows without a matching translation row keep their canonical value.
 */
async function applyTranslations<T extends { id: string }>(
  rows: T[],
  entityType: string,
  locale: Locale,
  fields: readonly (keyof T)[],
): Promise<T[]> {
  if (rows.length === 0) return rows;
  if (locale === "en") return rows; // canonical columns are English

  const ids = rows.map((r) => r.id);
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("translations")
    .select("entity_id, field, value")
    .eq("entity_type", entityType)
    .eq("locale", locale)
    .in("entity_id", ids);

  if (!data || data.length === 0) return rows;

  // index: id -> field -> value
  const map = new Map<string, Record<string, string>>();
  for (const t of data) {
    const inner = map.get(t.entity_id) ?? {};
    inner[t.field] = t.value;
    map.set(t.entity_id, inner);
  }

  const fieldSet = new Set(fields.map(String));
  return rows.map((r) => {
    const overrides = map.get(r.id);
    if (!overrides) return r;
    const out: T = { ...r };
    for (const [k, v] of Object.entries(overrides)) {
      if (fieldSet.has(k)) {
        (out as Record<string, unknown>)[k] = v;
      }
    }
    return out;
  });
}

export async function getActiveBarbers(): Promise<Barber[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("barbers")
    .select("*")
    .eq("active", true)
    .order("display_order");
  return data ?? [];
}

export async function getBarberBySlug(slug: string): Promise<Barber | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("barbers")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return data;
}

export async function getActiveServices(): Promise<Service[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("display_order");
  return data ?? [];
}

export async function getServicesForBarber(
  barberId: string,
): Promise<Service[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("services")
    .select("*, barber_services!inner(barber_id)")
    .eq("active", true)
    .eq("barber_services.barber_id", barberId)
    .order("display_order");
  return (data as unknown as Service[]) ?? [];
}

export async function getShopHours(): Promise<ShopHours[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("shop_hours")
    .select("*")
    .order("day_of_week");
  return data ?? [];
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("display_order");
  return data ?? [];
}

// -----------------------------------------------------------------
// Locale-aware variants. English locale returns canonical rows.
// Vietnamese locale merges in any rows from `public.translations`.
// -----------------------------------------------------------------

export async function getActiveBarbersLocalized(
  locale: Locale,
): Promise<Barber[]> {
  const rows = await getActiveBarbers();
  return applyTranslations(rows, "barber", locale, ["name", "bio"] as const);
}

export async function getBarberBySlugLocalized(
  slug: string,
  locale: Locale,
): Promise<Barber | null> {
  const row = await getBarberBySlug(slug);
  if (!row) return null;
  const [out] = await applyTranslations([row], "barber", locale, [
    "name",
    "bio",
  ] as const);
  return out;
}

export async function getActiveServicesLocalized(
  locale: Locale,
): Promise<Service[]> {
  const rows = await getActiveServices();
  return applyTranslations(rows, "service", locale, [
    "name",
    "description",
  ] as const);
}

export async function getServicesForBarberLocalized(
  barberId: string,
  locale: Locale,
): Promise<Service[]> {
  const rows = await getServicesForBarber(barberId);
  return applyTranslations(rows, "service", locale, [
    "name",
    "description",
  ] as const);
}

export async function getGalleryPhotosLocalized(
  locale: Locale,
): Promise<GalleryPhoto[]> {
  const rows = await getGalleryPhotos();
  return applyTranslations(rows, "gallery_photo", locale, [
    "caption",
  ] as const);
}

/**
 * Fetch the per-locale translation overrides for a single entity.
 * Returns `{ field: value }` for every row in `public.translations` matching
 * (entity_type, entity_id, locale). Used by admin forms to prefill VN inputs.
 */
export async function getTranslationsFor(
  entityType: string,
  entityId: string,
  locale: Locale,
): Promise<Record<string, string>> {
  if (locale === "en") return {};
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("translations")
    .select("field, value")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("locale", locale);
  return Object.fromEntries((data ?? []).map((t) => [t.field, t.value]));
}

// -----------------------------------------------------------------
// Multi-service appointment helpers.
// -----------------------------------------------------------------

type Servicey = { id: string; name: string } & Partial<Service>;

type JunctionRow<S = Servicey> = {
  position: number;
  services: S | S[] | null;
};

/**
 * Flatten the `appointment_services(position, services(...))` shape Supabase
 * returns into a plain ordered array of services. Sorts by `position` so the
 * customer's selection order is preserved. The caller chooses which service
 * columns to select; the type follows the input.
 */
export function flattenAppointmentServices<S>(
  rows: JunctionRow<S>[] | null | undefined,
): S[] {
  if (!rows) return [];
  const ordered = [...rows].sort((a, b) => a.position - b.position);
  const out: S[] = [];
  for (const r of ordered) {
    const s = Array.isArray(r.services) ? r.services[0] : r.services;
    if (s) out.push(s);
  }
  return out;
}

/**
 * Apply Vietnamese service-name translations to a flat list of services
 * pulled out of an appointment join. Mirrors `getActiveServicesLocalized`
 * but skips the initial fetch and accepts already-loaded rows.
 */
export async function localizeServices<T extends Servicey>(
  services: T[],
  locale: Locale,
): Promise<T[]> {
  if (services.length === 0 || locale === "en") return services;
  const withIds = services.filter((s): s is T & { id: string } => !!s.id);
  const localized = await applyTranslations(withIds, "service", locale, [
    "name",
    "description",
  ] as const);
  const byId = new Map(localized.map((s) => [s.id, s]));
  return services.map((s) => (s.id ? byId.get(s.id) ?? s : s));
}

export function publicPhotoUrl(storagePath: string): string {
  // Allow full URLs (used by mock seed data); otherwise build the public
  // Supabase Storage URL: <SUPABASE_URL>/storage/v1/object/public/gallery/<path>
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${url}/storage/v1/object/public/gallery/${storagePath}`;
}
