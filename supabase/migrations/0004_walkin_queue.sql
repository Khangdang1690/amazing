-- Walk-in customer queue support.
-- Walk-ins are stored as appointments with status = 'walkin'. They have no
-- meaningful starts_at/ends_at (placeholders are written on insert), so they
-- are filtered out of the availability calculator and the bookable grid.

-- Allow 'walkin' as an appointment status.
alter table public.appointments drop constraint appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('confirmed','completed','cancelled','no_show','walkin'));

-- Walk-in customers may pay cash and not share a phone.
alter table public.appointments alter column customer_phone drop not null;

-- Speed up "today's queue" lookups (FIFO by created_at).
create index if not exists appointments_walkin_queue_idx
  on public.appointments (created_at)
  where status = 'walkin';
