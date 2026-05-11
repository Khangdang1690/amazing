-- Translations for DB-stored content (service names, barber bios, gallery captions).
-- Keyed by (entity_type, entity_id, locale, field). The canonical English value
-- still lives on the original column on each entity; this table holds overrides.
-- Writes go through server actions using the service-role key (bypasses RLS),
-- following the same pattern as appointments/login_codes.

create table public.translations (
  entity_type text not null,
  entity_id   uuid not null,
  locale      text not null,
  field       text not null,
  value       text not null,
  updated_at  timestamptz not null default now(),
  primary key (entity_type, entity_id, locale, field)
);

create index translations_lookup_idx
  on public.translations (entity_type, locale);

alter table public.translations enable row level security;

create policy "translations public read"
  on public.translations for select to anon, authenticated
  using (true);
