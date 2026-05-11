-- Amazing Hair Design — initial schema
-- Run via Supabase CLI: supabase db push
-- Or paste into Supabase SQL editor.

create extension if not exists "pgcrypto";

-- =============================================================
-- barbers
-- =============================================================
create table public.barbers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  bio           text,
  avatar_url    text,
  active        boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- =============================================================
-- services
-- =============================================================
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents      int not null check (price_cents >= 0),
  active           boolean not null default true,
  display_order    int not null default 0,
  created_at       timestamptz not null default now()
);

-- =============================================================
-- barber_services (m:n)
-- =============================================================
create table public.barber_services (
  barber_id  uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- =============================================================
-- shop_hours (weekly recurring; one row per day_of_week)
-- 0 = Sunday .. 6 = Saturday
-- =============================================================
create table public.shop_hours (
  day_of_week int primary key check (day_of_week between 0 and 6),
  open_time   time,
  close_time  time,
  closed      boolean not null default false
);

-- =============================================================
-- time_off (one-off closures or barber PTO)
-- =============================================================
create table public.time_off (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid references public.barbers(id) on delete cascade, -- null = whole shop
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index time_off_window_idx on public.time_off (barber_id, starts_at, ends_at);

-- =============================================================
-- appointments
-- =============================================================
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  barber_id         uuid not null references public.barbers(id),
  service_id        uuid not null references public.services(id),
  customer_name     text not null,
  customer_phone    text not null,
  customer_email    text not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  status            text not null default 'confirmed'
                       check (status in ('confirmed','completed','cancelled','no_show')),
  notes             text,
  internal_notes    text,
  reminder_sent_at  timestamptz,
  created_at        timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_barber_time_idx on public.appointments (barber_id, starts_at);
create index appointments_phone_idx       on public.appointments (customer_phone);
create index appointments_starts_at_idx   on public.appointments (starts_at);

-- =============================================================
-- gallery_photos
-- =============================================================
create table public.gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null,
  caption       text,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- =============================================================
-- OTP for /my-bookings (one-time codes)
-- =============================================================
create table public.login_codes (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  consumed   boolean not null default false,
  created_at timestamptz not null default now()
);
create index login_codes_phone_idx on public.login_codes (phone, created_at desc);

-- =============================================================
-- Race-safe booking insert: only inserts when no overlap exists
-- =============================================================
create or replace function public.create_appointment_if_free(
  p_barber_id      uuid,
  p_service_id     uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_customer_email text,
  p_starts_at      timestamptz,
  p_ends_at        timestamptz,
  p_notes          text
) returns public.appointments
language plpgsql
as $$
declare
  v_row public.appointments;
begin
  if exists (
    select 1 from public.appointments
    where barber_id = p_barber_id
      and status <> 'cancelled'
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    return null;
  end if;

  if exists (
    select 1 from public.time_off
    where (barber_id = p_barber_id or barber_id is null)
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    return null;
  end if;

  insert into public.appointments
    (barber_id, service_id, customer_name, customer_phone, customer_email,
     starts_at, ends_at, notes)
  values
    (p_barber_id, p_service_id, p_customer_name, p_customer_phone, p_customer_email,
     p_starts_at, p_ends_at, p_notes)
  returning * into v_row;

  return v_row;
end;
$$;

-- =============================================================
-- RLS
-- =============================================================
alter table public.barbers         enable row level security;
alter table public.services        enable row level security;
alter table public.barber_services enable row level security;
alter table public.shop_hours      enable row level security;
alter table public.time_off        enable row level security;
alter table public.appointments    enable row level security;
alter table public.gallery_photos  enable row level security;
alter table public.login_codes     enable row level security;

create policy "barbers public read"
  on public.barbers for select to anon, authenticated
  using (active = true);

create policy "services public read"
  on public.services for select to anon, authenticated
  using (active = true);

create policy "barber_services public read"
  on public.barber_services for select to anon, authenticated
  using (true);

create policy "shop_hours public read"
  on public.shop_hours for select to anon, authenticated
  using (true);

create policy "gallery_photos public read"
  on public.gallery_photos for select to anon, authenticated
  using (true);

-- appointments / time_off / login_codes: NO public policies.
-- All access flows through Server Actions using the service-role key,
-- which bypasses RLS.

-- =============================================================
-- Storage bucket for gallery photos (public read)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "gallery public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'gallery');
