export type Barber = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  active: boolean;
  display_order: number;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  display_order: number;
};

export type ShopHours = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
};

export type AppointmentStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "walkin";

export type Appointment = {
  id: string;
  barber_id: string;
  customer_name: string;
  customer_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  internal_notes: string | null;
  reminder_sent_at: string | null;
  created_at: string;
};

export type AppointmentService = {
  appointment_id: string;
  service_id: string;
  position: number;
};

export type TimeOff = {
  id: string;
  barber_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type GalleryPhoto = {
  id: string;
  storage_path: string;
  caption: string | null;
  display_order: number;
};
