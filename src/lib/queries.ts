import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Barber,
  Service,
  ShopHours,
  GalleryPhoto,
} from "@/lib/types";

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

export function publicPhotoUrl(storagePath: string): string {
  // Allow full URLs (used by mock seed data); otherwise build the public
  // Supabase Storage URL: <SUPABASE_URL>/storage/v1/object/public/gallery/<path>
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${url}/storage/v1/object/public/gallery/${storagePath}`;
}
