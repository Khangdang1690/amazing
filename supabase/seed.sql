-- Seed data for Amazing Hair Design. Idempotent.

-- ---------- Barbers ----------
insert into public.barbers (name, slug, bio, active, display_order) values
  ('Tommy',  'tommy',  'Owner & master barber. Follow on Instagram @tommyamazinghair for the latest work.', true, 0),
  ('Andy',   'andy',   'Specializes in fades, tapers, and classic cuts.', true, 1),
  ('Kevin',  'kevin',  'Kids cuts and beard trims a specialty.', true, 2)
on conflict (slug) do update set
  name = excluded.name,
  bio  = excluded.bio,
  active = excluded.active,
  display_order = excluded.display_order;

-- ---------- Services ----------
insert into public.services (name, description, duration_minutes, price_cents, display_order)
select * from (values
  ('Men''s Haircut',          'Classic cut, wash, and style.',                     30, 3500, 0),
  ('Fade',                    'Skin, low, mid, or high fade. Precision tapering.', 45, 4000, 1),
  ('Kids Cut',                'For ages 12 and under.',                            30, 2500, 2),
  ('Beard Trim',              'Shape-up and line work.',                           20, 2000, 3),
  ('Hot Towel Shave',         'Traditional straight-razor shave with hot towel.',  45, 4000, 4),
  ('Haircut + Beard Combo',   'Full cut paired with beard shaping.',               50, 5000, 5),
  ('Senior Cut',              'For guests 60+.',                                   30, 2500, 6)
) as v(name, description, duration_minutes, price_cents, display_order)
where not exists (select 1 from public.services where services.name = v.name);

-- Map every active barber to every service
insert into public.barber_services (barber_id, service_id)
select b.id, s.id from public.barbers b cross join public.services s
on conflict do nothing;

-- ---------- Vietnamese translations (services) ----------
insert into public.translations (entity_type, entity_id, locale, field, value)
select 'service', s.id, 'vi', 'name', v.vi_name
from public.services s
join (values
  ('Men''s Haircut',         'Cắt tóc nam'),
  ('Fade',                   'Cắt fade'),
  ('Kids Cut',               'Cắt tóc trẻ em'),
  ('Beard Trim',             'Tỉa râu'),
  ('Hot Towel Shave',        'Cạo râu khăn nóng'),
  ('Haircut + Beard Combo',  'Combo cắt tóc + tỉa râu'),
  ('Senior Cut',             'Cắt tóc người cao tuổi')
) as v(en_name, vi_name) on s.name = v.en_name
on conflict (entity_type, entity_id, locale, field) do update
  set value = excluded.value, updated_at = now();

insert into public.translations (entity_type, entity_id, locale, field, value)
select 'service', s.id, 'vi', 'description', v.vi_desc
from public.services s
join (values
  ('Men''s Haircut',         'Cắt cổ điển, gội, và tạo kiểu.'),
  ('Fade',                   'Fade trắng, thấp, vừa, hoặc cao. Cạo nhỏ dần chính xác.'),
  ('Kids Cut',               'Dành cho bé 12 tuổi trở xuống.'),
  ('Beard Trim',             'Tạo dáng và đường nét cho râu.'),
  ('Hot Towel Shave',        'Cạo râu dao thẳng truyền thống với khăn nóng.'),
  ('Haircut + Beard Combo',  'Cắt tóc trọn gói kết hợp tạo dáng râu.'),
  ('Senior Cut',             'Dành cho khách từ 60 tuổi trở lên.')
) as v(en_name, vi_desc) on s.name = v.en_name
on conflict (entity_type, entity_id, locale, field) do update
  set value = excluded.value, updated_at = now();

-- ---------- Vietnamese translations (barber bios) ----------
-- Names (Tommy/Andy/Kevin) are proper nouns and left untranslated.
insert into public.translations (entity_type, entity_id, locale, field, value)
select 'barber', b.id, 'vi', 'bio', v.vi_bio
from public.barbers b
join (values
  ('tommy', 'Chủ tiệm & thợ cắt tóc bậc thầy. Theo dõi Instagram @tommyamazinghair để xem các tác phẩm mới nhất.'),
  ('andy',  'Chuyên fade, taper, và cắt tóc cổ điển.'),
  ('kevin', 'Chuyên cắt tóc trẻ em và tỉa râu.')
) as v(slug, vi_bio) on b.slug = v.slug
on conflict (entity_type, entity_id, locale, field) do update
  set value = excluded.value, updated_at = now();

-- ---------- Shop hours ----------
-- 0 = Sunday .. 6 = Saturday
insert into public.shop_hours (day_of_week, open_time, close_time, closed) values
  (0, '10:00', '17:00', false), -- Sun
  (1, null,    null,    true),  -- Mon CLOSED
  (2, '09:00', '19:00', false), -- Tue
  (3, '09:00', '19:00', false), -- Wed
  (4, '09:00', '19:00', false), -- Thu
  (5, '09:00', '19:00', false), -- Fri
  (6, '09:00', '19:00', false)  -- Sat
on conflict (day_of_week) do update set
  open_time  = excluded.open_time,
  close_time = excluded.close_time,
  closed     = excluded.closed;
