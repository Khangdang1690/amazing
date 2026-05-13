import { z } from "zod";

// zod v4: use top-level format helpers (z.email, z.uuid, z.iso.datetime)
export const phoneSchema = z
  .string()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long");

export const serviceIdsSchema = z
  .array(z.uuid())
  .min(1, "Pick at least one service")
  .max(6, "Pick at most 6 services");

export const createBookingSchema = z.object({
  barberId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  customerName: z.string().min(1, "Name is required").max(120),
  customerPhone: phoneSchema,
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const createWalkinSchema = z.object({
  barberId: z.uuid(),
  serviceIds: serviceIdsSchema,
  customerName: z.string().min(1, "Name is required").max(120),
  customerPhone: phoneSchema.optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type CreateWalkinInput = z.infer<typeof createWalkinSchema>;

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const barberSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only"),
  bio: z.string().max(1000).optional().or(z.literal("")),
  bioVi: z.string().max(1000).optional().or(z.literal("")),
  avatarUrl: z.url().optional().or(z.literal("")),
  active: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1).max(120),
  nameVi: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  descriptionVi: z.string().max(500).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  priceCents: z.coerce.number().int().min(0),
  active: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const hoursSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  closed: z.boolean(),
});

export const timeOffSchema = z
  .object({
    barberId: z.uuid().optional().or(z.literal("")),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    reason: z.string().max(200).optional().or(z.literal("")),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  });
