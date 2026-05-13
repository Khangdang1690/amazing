-- Multi-service appointments + open-ended end time, in a single migration.
-- This collapses two design steps that were never applied separately:
--   1. Move services out of appointments into a junction table
--      (one appointment can hold many services).
--   2. Drop the customer-side end-time prediction. ends_at is recorded by
--      staff at serve time. Customers commit to a start time only;
--      services are assigned by staff at serve time (online bookings)
--      or at queue-add time (walk-ins).
--
-- The unified queue derives membership from:
--   status = 'walkin'  OR  (status = 'confirmed' AND starts_at <= now() AND ends_at IS NULL)

-- ---------------------------------------------------------------------------
-- 1. Wipe existing appointment data (user-authorized). cascade clears any
--    walk-in queue rows and dependents.
-- ---------------------------------------------------------------------------
truncate table public.appointments restart identity cascade;

-- ---------------------------------------------------------------------------
-- 2. Drop the single-service FK column. Junction is now the source of truth.
-- ---------------------------------------------------------------------------
alter table public.appointments drop column service_id;

create table public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id     uuid not null references public.services(id),
  position       int  not null default 0,
  primary key (appointment_id, service_id)
);
create index appointment_services_appt_idx on public.appointment_services (appointment_id);

-- ---------------------------------------------------------------------------
-- 3. ends_at is now nullable - it's the recorded actual end, not a prediction.
--    The inline check constraint from 0001 was anonymous; Postgres named it
--    appointments_check. Drop it and add a nullable-friendly replacement.
-- ---------------------------------------------------------------------------
alter table public.appointments alter column ends_at drop not null;
alter table public.appointments drop constraint appointments_check;
alter table public.appointments add constraint appointments_ends_after_starts
  check (ends_at is null or ends_at > starts_at);

-- Speed up the unified-queue read: past-due confirmed appointments waiting
-- alongside walk-ins.
create index if not exists appointments_queue_confirmed_idx
  on public.appointments (starts_at)
  where status = 'confirmed' and ends_at is null;

-- ---------------------------------------------------------------------------
-- 4. Rewrite the booking RPC. The original (from 0003) took a single
--    service_id and ends_at; the new one takes neither. Enforce one
--    appointment per (barber, exact starts_at) slot. Time-off is a
--    point-in-range test against the requested start.
-- ---------------------------------------------------------------------------
drop function if exists public.create_appointment_if_free(uuid, uuid, text, text, timestamptz, timestamptz, text);
create or replace function public.create_appointment_if_free(
  p_barber_id      uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_starts_at      timestamptz,
  p_notes          text
) returns public.appointments
language plpgsql
as $$
declare v_row public.appointments;
begin
  if exists (
    select 1 from public.appointments
     where barber_id = p_barber_id
       and status <> 'cancelled'
       and starts_at = p_starts_at
  ) then return null; end if;

  if exists (
    select 1 from public.time_off
     where (barber_id = p_barber_id or barber_id is null)
       and p_starts_at >= starts_at
       and p_starts_at <  ends_at
  ) then return null; end if;

  insert into public.appointments
    (barber_id, customer_name, customer_phone, starts_at, ends_at, notes)
  values
    (p_barber_id, p_customer_name, p_customer_phone, p_starts_at, null, p_notes)
  returning * into v_row;

  return v_row;
end;
$$;
