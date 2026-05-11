"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMinutes } from "date-fns";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createBookingSchema, requestOtpSchema, verifyOtpSchema } from "@/lib/validators";
import { normalizeUSPhone } from "@/lib/phone";
import { sendBookingConfirmation, sendLoginCodeEmail } from "@/lib/email";

type ActionResult =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: string };

export async function createBookingAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createBookingSchema.safeParse({
    barberId: formData.get("barberId"),
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    const issues = parsed.error.issues;
    return {
      ok: false,
      error: issues[0]?.message ?? "Please check the form and try again.",
    };
  }

  const input = parsed.data;
  const phoneE164 = normalizeUSPhone(input.customerPhone);
  if (!phoneE164) {
    return { ok: false, error: "Enter a valid US phone number." };
  }

  const supabase = createSupabaseAdminClient();

  // Refetch barber + service so duration and names are authoritative
  const [barberRes, serviceRes] = await Promise.all([
    supabase
      .from("barbers")
      .select("id, name, active")
      .eq("id", input.barberId)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, active")
      .eq("id", input.serviceId)
      .maybeSingle(),
  ]);

  const barber = barberRes.data;
  const service = serviceRes.data;
  if (!barber || !barber.active) {
    return { ok: false, error: "Barber not found." };
  }
  if (!service || !service.active) {
    return { ok: false, error: "Service not found." };
  }

  const startsAt = new Date(input.startsAt);
  if (startsAt.getTime() < Date.now()) {
    return { ok: false, error: "That time has already passed." };
  }
  const endsAt = addMinutes(startsAt, service.duration_minutes);

  // Atomic insert with overlap check
  const { data: inserted, error } = await supabase.rpc(
    "create_appointment_if_free",
    {
      p_barber_id: barber.id,
      p_service_id: service.id,
      p_customer_name: input.customerName,
      p_customer_phone: phoneE164,
      p_customer_email: input.customerEmail,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
      p_notes: input.notes && input.notes.length > 0 ? input.notes : null,
    },
  );

  if (error) {
    console.error("[createBookingAction] rpc error:", error);
    return { ok: false, error: "Could not save your booking. Try again." };
  }

  if (!inserted) {
    return {
      ok: false,
      error:
        "That time was just taken by another customer. Please pick a different slot.",
    };
  }

  const appointmentId = (inserted as { id: string }).id;

  // Fire-and-forget confirmation email
  sendBookingConfirmation({
    to: input.customerEmail,
    customerName: input.customerName,
    barberName: barber.name,
    serviceName: service.name,
    startsAt: startsAt.toISOString(),
    priceCents: service.price_cents,
    durationMinutes: service.duration_minutes,
  }).catch((e) => console.error("[email] confirmation failed:", e));

  revalidatePath("/admin");
  revalidatePath(`/book/${barber.id}`);

  redirect(`/book/success?id=${appointmentId}`);
}

export async function cancelBookingAction(
  appointmentId: string,
  phoneRaw: string,
): Promise<ActionResult> {
  const phone = normalizeUSPhone(phoneRaw);
  if (!phone) return { ok: false, error: "Invalid phone." };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("customer_phone", phone)
    .in("status", ["confirmed"])
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Could not cancel. Call us instead." };
  }
  revalidatePath("/my-bookings");
  revalidatePath("/admin");
  return { ok: true };
}

// -------------------------------------------------------------------
// OTP flow for /my-bookings
// -------------------------------------------------------------------

function generate6DigitCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function hashCode(code: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(code));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function requestOtpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestOtpSchema.safeParse({
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid phone number." };
  }
  const phone = normalizeUSPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "Enter a valid US phone number." };

  const supabase = createSupabaseAdminClient();

  // Find the most recent email on file for this phone
  const { data: prior } = await supabase
    .from("appointments")
    .select("customer_email")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prior?.customer_email) {
    return {
      ok: false,
      error: "We couldn't find any bookings for that number.",
    };
  }

  const code = generate6DigitCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabase
    .from("login_codes")
    .insert({ phone, code_hash: codeHash, expires_at: expiresAt });

  sendLoginCodeEmail({ to: prior.customer_email, code }).catch((e) =>
    console.error("[email] OTP failed:", e),
  );

  return { ok: true };
}

export async function verifyOtpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = verifyOtpSchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter the 6-digit code." };
  }
  const phone = normalizeUSPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "Invalid phone." };

  const codeHash = await hashCode(parsed.data.code);
  const supabase = createSupabaseAdminClient();

  const { data: row } = await supabase
    .from("login_codes")
    .select("id, expires_at, consumed")
    .eq("phone", phone)
    .eq("code_hash", codeHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || row.consumed || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "Invalid or expired code." };
  }

  await supabase
    .from("login_codes")
    .update({ consumed: true })
    .eq("id", row.id);

  // Encode phone into a signed cookie-less query param;
  // we set a server cookie via Response — instead we'll just redirect
  // with the phone in a short-lived session cookie set via headers.
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("mb_phone", phone, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 2, // 2 hours
    path: "/",
  });

  revalidatePath("/my-bookings");
  return { ok: true };
}

export async function signOutMyBookingsAction(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("mb_phone");
  revalidatePath("/my-bookings");
}
