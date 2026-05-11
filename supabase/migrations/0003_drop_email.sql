-- Drop customer_email from appointments. Phone is the identifier;
-- OTP delivery moved from Resend email to Twilio SMS.
alter table public.appointments drop column customer_email;

-- create_appointment_if_free no longer takes p_customer_email.
-- DROP first because Postgres treats arg-list changes as a different overload.
drop function if exists public.create_appointment_if_free(
  uuid, uuid, text, text, text, timestamptz, timestamptz, text
);

create or replace function public.create_appointment_if_free(
  p_barber_id      uuid,
  p_service_id     uuid,
  p_customer_name  text,
  p_customer_phone text,
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
    (barber_id, service_id, customer_name, customer_phone,
     starts_at, ends_at, notes)
  values
    (p_barber_id, p_service_id, p_customer_name, p_customer_phone,
     p_starts_at, p_ends_at, p_notes)
  returning * into v_row;

  return v_row;
end;
$$;
