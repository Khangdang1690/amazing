"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  barberSchema,
  serviceSchema,
  hoursSchema,
  timeOffSchema,
} from "@/lib/validators";
import { env } from "@/lib/env";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");
  if (
    env.allowedAdminEmails.length > 0 &&
    !env.allowedAdminEmails.includes(user.email.toLowerCase())
  ) {
    throw new Error("Not authorized");
  }
  return user;
}

// Upsert translation overrides for a single entity. Empty/blank values delete
// the override so the canonical English column is used instead.
async function upsertTranslations(
  entityType: string,
  entityId: string,
  values: Record<string, string | null | undefined>,
  locale: "vi" = "vi",
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const upserts: Array<{
    entity_type: string;
    entity_id: string;
    locale: string;
    field: string;
    value: string;
  }> = [];
  const deletes: string[] = [];
  for (const [field, raw] of Object.entries(values)) {
    const v = (raw ?? "").trim();
    if (v.length > 0) {
      upserts.push({
        entity_type: entityType,
        entity_id: entityId,
        locale,
        field,
        value: v,
      });
    } else {
      deletes.push(field);
    }
  }
  if (upserts.length > 0) {
    await supabase.from("translations").upsert(upserts, {
      onConflict: "entity_type,entity_id,locale,field",
    });
  }
  if (deletes.length > 0) {
    await supabase
      .from("translations")
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("locale", locale)
      .in("field", deletes);
  }
}

// -------------------- Auth --------------------

export async function signInAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = (formData.get("email") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const next = (formData.get("next") as string | null) ?? "/admin";

  if (
    env.allowedAdminEmails.length > 0 &&
    !env.allowedAdminEmails.includes(email.toLowerCase())
  ) {
    return { error: "This email is not on the admin allowlist." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// -------------------- Appointments --------------------

export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: "completed" | "cancelled" | "no_show" | "confirmed",
): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);
  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
}

export async function updateAppointmentNotesAction(
  appointmentId: string,
  internalNotes: string,
): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("appointments")
    .update({ internal_notes: internalNotes })
    .eq("id", appointmentId);
  revalidatePath("/admin/appointments");
}

// -------------------- Barbers --------------------

export async function upsertBarberAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireAdmin();
  const parsed = barberSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug"),
    bio: formData.get("bio") ?? "",
    bioVi: formData.get("bio_vi") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
    active: formData.get("active") === "on",
    displayOrder: formData.get("displayOrder") ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const supabase = createSupabaseAdminClient();
  const row = {
    name: v.name,
    slug: v.slug,
    bio: v.bio || null,
    avatar_url: v.avatarUrl || null,
    active: v.active,
    display_order: v.displayOrder,
  };
  const { data: upserted, error } = v.id
    ? await supabase
        .from("barbers")
        .update(row)
        .eq("id", v.id)
        .select("id")
        .maybeSingle()
    : await supabase.from("barbers").insert(row).select("id").maybeSingle();
  if (error) return { error: error.message };

  if (upserted?.id) {
    await upsertTranslations("barber", upserted.id, { bio: v.bioVi });
  }

  revalidatePath("/admin/barbers");
  revalidatePath("/");
  revalidatePath("/book");
  return null;
}

export async function deleteBarberAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  await supabase.from("barbers").delete().eq("id", id);
  revalidatePath("/admin/barbers");
  revalidatePath("/");
}

// -------------------- Services --------------------

export async function upsertServiceAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireAdmin();
  const parsed = serviceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    nameVi: formData.get("name_vi") ?? "",
    description: formData.get("description") ?? "",
    descriptionVi: formData.get("description_vi") ?? "",
    durationMinutes: formData.get("durationMinutes"),
    priceCents: formData.get("priceCents"),
    active: formData.get("active") === "on",
    displayOrder: formData.get("displayOrder") ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const supabase = createSupabaseAdminClient();
  const row = {
    name: v.name,
    description: v.description || null,
    duration_minutes: v.durationMinutes,
    price_cents: v.priceCents,
    active: v.active,
    display_order: v.displayOrder,
  };
  const { data: upserted, error } = v.id
    ? await supabase
        .from("services")
        .update(row)
        .eq("id", v.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("services")
        .insert(row)
        .select("id")
        .maybeSingle();
  if (error) return { error: error.message };

  // If new service, link all active barbers
  if (!v.id && upserted) {
    const { data: barbers } = await supabase
      .from("barbers")
      .select("id")
      .eq("active", true);
    if (barbers && barbers.length > 0) {
      await supabase.from("barber_services").insert(
        barbers.map((b) => ({ barber_id: b.id, service_id: upserted.id })),
      );
    }
  }

  if (upserted?.id) {
    await upsertTranslations("service", upserted.id, {
      name: v.nameVi,
      description: v.descriptionVi,
    });
  }

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
  return null;
}

export async function deleteServiceAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/admin/services");
  revalidatePath("/services");
}

// -------------------- Hours --------------------

export async function updateHoursAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  // Update all 7 days from the form (one row each)
  for (let dow = 0; dow < 7; dow++) {
    const parsed = hoursSchema.safeParse({
      dayOfWeek: dow,
      openTime: formData.get(`open_${dow}`) ?? "",
      closeTime: formData.get(`close_${dow}`) ?? "",
      closed: formData.get(`closed_${dow}`) === "on",
    });
    if (!parsed.success) {
      return {
        error: `Day ${dow}: ${parsed.error.issues[0]?.message ?? "Invalid"}`,
      };
    }
    const v = parsed.data;
    await supabase.from("shop_hours").upsert(
      {
        day_of_week: dow,
        open_time: v.closed ? null : v.openTime || null,
        close_time: v.closed ? null : v.closeTime || null,
        closed: v.closed,
      },
      { onConflict: "day_of_week" },
    );
  }
  revalidatePath("/admin/hours");
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/book");
  return null;
}

export async function createTimeOffAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireAdmin();
  const parsed = timeOffSchema.safeParse({
    barberId: formData.get("barberId") ?? "",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const supabase = createSupabaseAdminClient();
  await supabase.from("time_off").insert({
    barber_id: v.barberId || null,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
    reason: v.reason || null,
  });
  revalidatePath("/admin/hours");
  return null;
}

export async function deleteTimeOffAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  await supabase.from("time_off").delete().eq("id", id);
  revalidatePath("/admin/hours");
}

// -------------------- Gallery --------------------

export async function uploadGalleryPhotoAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  const caption = ((formData.get("caption") as string | null) ?? "").trim();
  const captionVi = (
    (formData.get("caption_vi") as string | null) ?? ""
  ).trim();

  if (!file || file.size === 0) {
    return { error: "Pick a photo." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Max 5 MB per photo." };
  }

  const supabase = createSupabaseAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from("gallery")
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) return { error: upErr.message };

  const { data: inserted } = await supabase
    .from("gallery_photos")
    .insert({ storage_path: path, caption: caption || null })
    .select("id")
    .maybeSingle();

  if (inserted?.id && captionVi.length > 0) {
    await upsertTranslations("gallery_photo", inserted.id, {
      caption: captionVi,
    });
  }

  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
  return null;
}

export async function deleteGalleryPhotoAction(
  id: string,
  storagePath: string,
): Promise<void> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  await supabase.storage.from("gallery").remove([storagePath]);
  await supabase.from("gallery_photos").delete().eq("id", id);
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}
