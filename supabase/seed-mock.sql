-- =============================================================================
-- Amazing Hair Design — MOCK demo data (gallery photos + 40 appointments)
--
-- This is *optional*. Run AFTER supabase/seed.sql (which seeds barbers,
-- services, and hours). Safe to run multiple times: each block is idempotent.
--
-- Idea: populate the admin dashboard so it doesn't feel empty on day one,
-- and give the rebook flow something to demo (several customers repeat).
-- Customer names lean Westminster / Little Saigon. Phone numbers use the
-- 555-01xx fictional prefix so they never collide with a real number.
--
-- Run in Supabase SQL editor or via psql.
-- =============================================================================

-- ============ Gallery: curated barbershop photos via Unsplash ===============
-- We store the *full URL* in storage_path. queries.ts detects http(s):// and
-- returns it as-is. The shop owner can later replace these via the admin
-- gallery uploader (which writes to Supabase Storage and stores a relative
-- path).

insert into public.gallery_photos (storage_path, caption, display_order)
select * from (values
  ('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80', 'Mid skin fade — finished',                   0),
  ('https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=80', 'Crisp line-up',                                1),
  ('https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&q=80', 'Tommy at the chair',                           2),
  ('https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&q=80', 'Classic taper with beard work',                3),
  ('https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900&q=80', 'Clippers in motion',                           4),
  ('https://images.unsplash.com/photo-1635273051937-c0277a72e0e4?w=900&q=80', 'Hot towel before the shave',                   5),
  ('https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=900&q=80', 'Detail on the temple',                         6),
  ('https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=900&q=80', 'Shop, late afternoon',                         7)
) as v(storage_path, caption, display_order)
where not exists (
  select 1 from public.gallery_photos where gallery_photos.storage_path = v.storage_path
);

-- ============ Appointments ===================================================
-- Wrapped in a DO block so we can resolve barber + service UUIDs by slug/name.
-- Only runs if appointments table is empty (idempotency on re-seed).

do $$
declare
  v_tommy uuid; v_andy uuid; v_kevin uuid;
  v_haircut uuid; v_fade uuid; v_kids uuid; v_beard uuid;
  v_shave uuid; v_combo uuid; v_senior uuid;
  v_tz constant text := 'America/Los_Angeles';

  -- Local helper: build a timestamptz at a given calendar offset + clock time
  -- in shop TZ. Used inline below via `mk(N, 'HH:MM')`.
begin
  if exists (select 1 from public.appointments) then
    return;
  end if;

  select id into v_tommy from public.barbers where slug = 'tommy';
  select id into v_andy  from public.barbers where slug = 'andy';
  select id into v_kevin from public.barbers where slug = 'kevin';

  select id into v_haircut from public.services where name = 'Men''s Haircut';
  select id into v_fade    from public.services where name = 'Fade';
  select id into v_kids    from public.services where name = 'Kids Cut';
  select id into v_beard   from public.services where name = 'Beard Trim';
  select id into v_shave   from public.services where name = 'Hot Towel Shave';
  select id into v_combo   from public.services where name = 'Haircut + Beard Combo';
  select id into v_senior  from public.services where name = 'Senior Cut';

  if v_tommy is null or v_haircut is null then
    raise exception 'Run supabase/seed.sql first — barbers and services must exist.';
  end if;

  -- ---------------------------------------------------------------------------
  -- Helper macro: cast (current_date - N) at HH:MM in shop TZ to timestamptz.
  -- We'll inline it for clarity.
  -- ---------------------------------------------------------------------------

  -- ========================== TOMMY — past ==================================
  insert into public.appointments
    (barber_id, service_id, customer_name, customer_phone,
     starts_at, ends_at, status, notes, reminder_sent_at)
  values
  -- 3 days ago
  (v_tommy, v_fade,    'Tuan Pham',         '+17145550142',
    ((current_date - 3)::timestamp + time '11:00') at time zone v_tz,
    ((current_date - 3)::timestamp + time '11:45') at time zone v_tz,
    'completed', null, ((current_date - 4)::timestamp + time '11:00') at time zone v_tz),
  -- 5 days ago
  (v_tommy, v_combo,   'David Kim',         '+17145550158',
    ((current_date - 5)::timestamp + time '14:30') at time zone v_tz,
    ((current_date - 5)::timestamp + time '15:20') at time zone v_tz,
    'completed', null, ((current_date - 6)::timestamp + time '14:30') at time zone v_tz),
  -- 7 days ago
  (v_tommy, v_haircut, 'Mike Chen',         '+17145550199',
    ((current_date - 7)::timestamp + time '10:00') at time zone v_tz,
    ((current_date - 7)::timestamp + time '10:30') at time zone v_tz,
    'completed', 'Same as last time — number 2 fade.', null),
  -- 9 days ago
  (v_tommy, v_fade,    'Bao Nguyen',        '+17145550221',
    ((current_date - 9)::timestamp + time '16:00') at time zone v_tz,
    ((current_date - 9)::timestamp + time '16:45') at time zone v_tz,
    'completed', null, null),
  -- 11 days ago
  (v_tommy, v_shave,   'Jose Garcia',       '+17145550244',
    ((current_date - 11)::timestamp + time '18:00') at time zone v_tz,
    ((current_date - 11)::timestamp + time '18:45') at time zone v_tz,
    'completed', null, null),
  -- 14 days ago — Tuan again (regular!)
  (v_tommy, v_fade,    'Tuan Pham',         '+17145550142',
    ((current_date - 14)::timestamp + time '11:00') at time zone v_tz,
    ((current_date - 14)::timestamp + time '11:45') at time zone v_tz,
    'completed', null, null),
  -- 17 days ago
  (v_tommy, v_fade,    'Hieu Le',           '+17145550267',
    ((current_date - 17)::timestamp + time '13:00') at time zone v_tz,
    ((current_date - 17)::timestamp + time '13:45') at time zone v_tz,
    'completed', null, null),
  -- 20 days ago
  (v_tommy, v_haircut, 'Marcus Johnson',    '+17145550283',
    ((current_date - 20)::timestamp + time '17:30') at time zone v_tz,
    ((current_date - 20)::timestamp + time '18:00') at time zone v_tz,
    'completed', null, null),
  -- 22 days ago
  (v_tommy, v_fade,    'Andy Vu',           '+17145550311',
    ((current_date - 22)::timestamp + time '10:30') at time zone v_tz,
    ((current_date - 22)::timestamp + time '11:15') at time zone v_tz,
    'completed', 'Tight skin fade on the sides.', null),
  -- 24 days ago
  (v_tommy, v_beard,   'Brian Nguyen',      '+17145550335',
    ((current_date - 24)::timestamp + time '12:30') at time zone v_tz,
    ((current_date - 24)::timestamp + time '12:50') at time zone v_tz,
    'completed', null, null),
  -- 26 days ago — David again
  (v_tommy, v_combo,   'David Kim',         '+17145550158',
    ((current_date - 26)::timestamp + time '14:30') at time zone v_tz,
    ((current_date - 26)::timestamp + time '15:20') at time zone v_tz,
    'completed', null, null),
  -- 28 days ago — cancelled
  (v_tommy, v_fade,    'Carlos Rodriguez',  '+17145550349',
    ((current_date - 28)::timestamp + time '09:30') at time zone v_tz,
    ((current_date - 28)::timestamp + time '10:15') at time zone v_tz,
    'cancelled', null, null);

  -- ========================== TOMMY — upcoming ==============================
  insert into public.appointments
    (barber_id, service_id, customer_name, customer_phone,
     starts_at, ends_at, status, notes)
  values
  (v_tommy, v_fade,    'Tony Park',         '+17145550372',
    ((current_date + 1)::timestamp + time '11:00') at time zone v_tz,
    ((current_date + 1)::timestamp + time '11:45') at time zone v_tz,
    'confirmed', null),
  (v_tommy, v_haircut, 'Linh Nguyen',       '+17145550388',
    ((current_date + 3)::timestamp + time '15:00') at time zone v_tz,
    ((current_date + 3)::timestamp + time '15:30') at time zone v_tz,
    'confirmed', 'First time here — please ask before going short.'),
  (v_tommy, v_fade,    'Tuan Pham',         '+17145550142',
    ((current_date + 5)::timestamp + time '11:00') at time zone v_tz,
    ((current_date + 5)::timestamp + time '11:45') at time zone v_tz,
    'confirmed', 'Same as always.'),
  (v_tommy, v_combo,   'Ryan Patel',        '+17145550401',
    ((current_date + 9)::timestamp + time '13:30') at time zone v_tz,
    ((current_date + 9)::timestamp + time '14:20') at time zone v_tz,
    'confirmed', null);

  -- ========================== ANDY — past ===================================
  insert into public.appointments
    (barber_id, service_id, customer_name, customer_phone,
     starts_at, ends_at, status, notes, reminder_sent_at)
  values
  -- 2 days ago
  (v_andy, v_fade,    'Khanh Phan',         '+17145550417',
    ((current_date - 2)::timestamp + time '13:00') at time zone v_tz,
    ((current_date - 2)::timestamp + time '13:45') at time zone v_tz,
    'completed', null, ((current_date - 3)::timestamp + time '13:00') at time zone v_tz),
  -- 4 days ago
  (v_andy, v_haircut, 'Daniel Ortiz',       '+17145550428',
    ((current_date - 4)::timestamp + time '17:00') at time zone v_tz,
    ((current_date - 4)::timestamp + time '17:30') at time zone v_tz,
    'completed', null, null),
  -- 6 days ago — Saturday kids cut
  (v_andy, v_kids,    'Eric Tran',          '+17145550433',
    ((current_date - 6)::timestamp + time '11:30') at time zone v_tz,
    ((current_date - 6)::timestamp + time '12:00') at time zone v_tz,
    'completed', '8 years old, wiggly. Bring stickers!', null),
  -- 8 days ago
  (v_andy, v_fade,    'Kevin Smith',        '+17145550441',
    ((current_date - 8)::timestamp + time '18:30') at time zone v_tz,
    ((current_date - 8)::timestamp + time '19:15') at time zone v_tz,
    'completed', null, null),
  -- 10 days ago
  (v_andy, v_haircut, 'Hoang Le',           '+17145550457',
    ((current_date - 10)::timestamp + time '14:00') at time zone v_tz,
    ((current_date - 10)::timestamp + time '14:30') at time zone v_tz,
    'completed', null, null),
  -- 13 days ago — Khanh again
  (v_andy, v_fade,    'Khanh Phan',         '+17145550417',
    ((current_date - 13)::timestamp + time '13:00') at time zone v_tz,
    ((current_date - 13)::timestamp + time '13:45') at time zone v_tz,
    'completed', null, null),
  -- 16 days ago — no-show
  (v_andy, v_shave,   'Anthony Diaz',       '+17145550466',
    ((current_date - 16)::timestamp + time '16:30') at time zone v_tz,
    ((current_date - 16)::timestamp + time '17:15') at time zone v_tz,
    'no_show', null, null),
  -- 19 days ago
  (v_andy, v_haircut, 'Vincent Le',         '+17145550478',
    ((current_date - 19)::timestamp + time '12:00') at time zone v_tz,
    ((current_date - 19)::timestamp + time '12:30') at time zone v_tz,
    'completed', null, null),
  -- 23 days ago
  (v_andy, v_fade,    'Steven Chen',        '+17145550481',
    ((current_date - 23)::timestamp + time '17:00') at time zone v_tz,
    ((current_date - 23)::timestamp + time '17:45') at time zone v_tz,
    'completed', null, null),
  -- 25 days ago
  (v_andy, v_kids,    'Justin Pham',        '+17145550492',
    ((current_date - 25)::timestamp + time '10:00') at time zone v_tz,
    ((current_date - 25)::timestamp + time '10:30') at time zone v_tz,
    'completed', null, null);

  -- ========================== ANDY — upcoming ===============================
  insert into public.appointments
    (barber_id, service_id, customer_name, customer_phone,
     starts_at, ends_at, status, notes)
  values
  (v_andy, v_haircut, 'Daniel Ortiz',       '+17145550428',
    ((current_date + 2)::timestamp + time '17:00') at time zone v_tz,
    ((current_date + 2)::timestamp + time '17:30') at time zone v_tz,
    'confirmed', null),
  (v_andy, v_fade,    'Khanh Phan',         '+17145550417',
    ((current_date + 6)::timestamp + time '13:00') at time zone v_tz,
    ((current_date + 6)::timestamp + time '13:45') at time zone v_tz,
    'confirmed', null),
  (v_andy, v_kids,    'Eric Tran',          '+17145550433',
    ((current_date + 8)::timestamp + time '11:30') at time zone v_tz,
    ((current_date + 8)::timestamp + time '12:00') at time zone v_tz,
    'confirmed', 'Birthday haircut!');

  -- ========================== KEVIN — past ==================================
  insert into public.appointments
    (barber_id, service_id, customer_name, customer_phone,
     starts_at, ends_at, status, notes, reminder_sent_at)
  values
  -- 1 day ago
  (v_kevin, v_beard,   'Anh Vu',            '+17145550502',
    ((current_date - 1)::timestamp + time '15:00') at time zone v_tz,
    ((current_date - 1)::timestamp + time '15:20') at time zone v_tz,
    'completed', null, ((current_date - 2)::timestamp + time '15:00') at time zone v_tz),
  -- 3 days ago
  (v_kevin, v_kids,    'William Park',      '+17145550516',
    ((current_date - 3)::timestamp + time '10:30') at time zone v_tz,
    ((current_date - 3)::timestamp + time '11:00') at time zone v_tz,
    'completed', null, null),
  -- 6 days ago — cancelled
  (v_kevin, v_haircut, 'Christopher Tran',  '+17145550533',
    ((current_date - 6)::timestamp + time '13:00') at time zone v_tz,
    ((current_date - 6)::timestamp + time '13:30') at time zone v_tz,
    'cancelled', null, null),
  -- 8 days ago
  (v_kevin, v_senior,  'Henry Nguyen',      '+17145550548',
    ((current_date - 8)::timestamp + time '09:30') at time zone v_tz,
    ((current_date - 8)::timestamp + time '10:00') at time zone v_tz,
    'completed', 'Henry — regular. Just a clean-up.', null),
  -- 12 days ago
  (v_kevin, v_fade,    'Phong Doan',        '+17145550551',
    ((current_date - 12)::timestamp + time '17:30') at time zone v_tz,
    ((current_date - 12)::timestamp + time '18:15') at time zone v_tz,
    'completed', null, null),
  -- 15 days ago — Anh again
  (v_kevin, v_beard,   'Anh Vu',            '+17145550502',
    ((current_date - 15)::timestamp + time '15:00') at time zone v_tz,
    ((current_date - 15)::timestamp + time '15:20') at time zone v_tz,
    'completed', null, null),
  -- 18 days ago
  (v_kevin, v_kids,    'Calvin Vo',         '+17145550569',
    ((current_date - 18)::timestamp + time '11:00') at time zone v_tz,
    ((current_date - 18)::timestamp + time '11:30') at time zone v_tz,
    'completed', null, null),
  -- 22 days ago — Henry again
  (v_kevin, v_senior,  'Henry Nguyen',      '+17145550548',
    ((current_date - 22)::timestamp + time '09:30') at time zone v_tz,
    ((current_date - 22)::timestamp + time '10:00') at time zone v_tz,
    'completed', null, null);

  -- ========================== KEVIN — upcoming ==============================
  insert into public.appointments
    (barber_id, service_id, customer_name, customer_phone,
     starts_at, ends_at, status, notes)
  values
  (v_kevin, v_senior,  'Henry Nguyen',      '+17145550548',
    ((current_date + 4)::timestamp + time '09:30') at time zone v_tz,
    ((current_date + 4)::timestamp + time '10:00') at time zone v_tz,
    'confirmed', null),
  (v_kevin, v_fade,    'Phong Doan',        '+17145550551',
    ((current_date + 7)::timestamp + time '17:30') at time zone v_tz,
    ((current_date + 7)::timestamp + time '18:15') at time zone v_tz,
    'confirmed', null),
  (v_kevin, v_beard,   'Anh Vu',            '+17145550502',
    ((current_date + 12)::timestamp + time '15:00') at time zone v_tz,
    ((current_date + 12)::timestamp + time '15:20') at time zone v_tz,
    'confirmed', null);

  raise notice 'Mock seed: % story appointments inserted',
    (select count(*) from public.appointments);
end $$;

-- =============================================================================
-- BULK seed: ~500 more appointments
-- Generates 90 days of past + 14 days of upcoming appointments, randomly
-- distributed across barbers, services, and a pool of 60 realistic customers
-- (some of whom overlap with the story-appointment customers above — they
-- become loyal repeat customers across the dataset).
--
-- Skips itself once the table has > 100 rows.
-- Uses a barber-level overlap check so existing appointments can't collide.
-- =============================================================================

do $$
declare
  v_tz constant text := 'America/Los_Angeles';

  v_barber_ids       uuid[];
  v_service_ids      uuid[];
  v_service_names    text[];
  v_service_minutes  int[];
  v_service_weights  int[];   -- relative pick weights; sums to 100
  v_weight_total     int;

  v_names  text[] := array[
    -- 60 customers — Westminster / Little Saigon-leaning mix
    'Tuan Pham','David Kim','Bao Nguyen','Hieu Le','Andy Vu',
    'Brian Nguyen','Tony Park','Linh Nguyen','Khanh Phan','Hoang Le',
    'Vincent Le','Justin Pham','Anh Vu','Henry Nguyen','Phong Doan',
    'Calvin Vo','Eric Tran','Christopher Tran','William Park','Steven Chen',
    'Daniel Ortiz','Jose Garcia','Carlos Rodriguez','Ryan Patel','Marcus Johnson',
    'Mike Chen','Anthony Diaz','Kevin Smith','Minh Tran','Hung Pham',
    'Long Nguyen','Vy Le','Tan Bui','Kien Vo','Quan Doan',
    'Khoa Truong','Duy Lam','Sang Ho','Chi Dao','Phu Mai',
    'Eddie Kim','James Tran','Alex Nguyen','Patrick Park','Hai Nguyen',
    'Phuc Tran','Tuan Bui','Khang Doan','Cuong Vu','Trung Le',
    'Brandon Chen','Jacob Pham','Aaron Lin','Ethan Vu','Owen Park',
    'Lucas Tran','Jay Pham','Nathan Le','Tim Nguyen','Adam Hoang'
  ];
  v_phones text[] := array[
    '+17145550142','+17145550158','+17145550221','+17145550267','+17145550311',
    '+17145550335','+17145550372','+17145550388','+17145550417','+17145550457',
    '+17145550478','+17145550492','+17145550502','+17145550548','+17145550551',
    '+17145550569','+17145550433','+17145550533','+17145550516','+17145550481',
    '+17145550428','+17145550244','+17145550349','+17145550401','+17145550283',
    '+17145550199','+17145550466','+17145550441','+17145550612','+17145550627',
    '+17145550633','+17145550648','+17145550651','+17145550666','+17145550672',
    '+17145550684','+17145550691','+17145550708','+17145550713','+17145550721',
    '+17145550735','+17145550748','+17145550752','+17145550766','+17145550771',
    '+17145550788','+17145550794','+17145550802','+17145550817','+17145550824',
    '+17145550831','+17145550842','+17145550857','+17145550869','+17145550873',
    '+17145550881','+17145550894','+17145550902','+17145550918','+17145550927'
  ];

  v_notes_pool text[] := array[
    'Same as last time.',
    'Tight skin fade on the sides.',
    'Number 2 on the sides, scissors on top.',
    'Keeping it long on top, neat on the sides.',
    'First time — happy with whatever you recommend.',
    'Going short — like a 1 all around.',
    'Beard line-up too please.',
    'Got a wedding this weekend.',
    'Just a cleanup.',
    null, null, null, null, null, null, null, null  -- weight nulls (most have no note)
  ];

  v_day_offset int;
  v_appts_today int;
  v_attempt int;
  v_barber_id uuid;
  v_service_idx int;
  v_service_id uuid;
  v_duration int;
  v_cust_idx int;
  v_hour int;
  v_minute int;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_status text;
  v_inserted_past int := 0;
  v_inserted_future int := 0;
  v_skipped int := 0;
  v_weight_pick int;
  v_acc int;
  v_i int;
  v_dow int;
  v_open_time time;
  v_close_time time;
  v_note text;
begin
  if (select count(*) from public.appointments) > 100 then
    raise notice 'Bulk seed already ran (% rows). Skipping.',
      (select count(*) from public.appointments);
    return;
  end if;

  select array_agg(id order by display_order) into v_barber_ids
    from public.barbers where active;

  select array_agg(id order by display_order),
         array_agg(name order by display_order),
         array_agg(duration_minutes order by display_order)
    into v_service_ids, v_service_names, v_service_minutes
    from public.services where active;

  if v_barber_ids is null or v_service_ids is null then
    raise exception 'Run supabase/seed.sql first — barbers and services must exist.';
  end if;

  -- Build a weight array aligned with v_service_names.
  -- Fade and Haircut are most common; specialty services rarer.
  v_service_weights := array(
    select case v_service_names[i]
             when 'Fade'                    then 32
             when 'Men''s Haircut'          then 30
             when 'Haircut + Beard Combo'   then 12
             when 'Beard Trim'              then 10
             when 'Hot Towel Shave'         then  7
             when 'Kids Cut'                then  6
             when 'Senior Cut'              then  3
             else 5
           end
    from generate_series(1, array_length(v_service_names, 1)) as i
  );
  v_weight_total := (select sum(w) from unnest(v_service_weights) as w);

  -- ---------------------------------------------------------------------------
  -- PAST 90 days
  -- ---------------------------------------------------------------------------
  for v_day_offset in 1..90 loop
    -- Shop hours for this day (Sun=0..Sat=6 in shop TZ)
    v_dow := extract(dow from (current_date - v_day_offset))::int;
    select open_time, close_time into v_open_time, v_close_time
      from public.shop_hours where day_of_week = v_dow and not closed;
    if v_open_time is null then
      continue; -- closed day
    end if;

    -- 3 to 10 attempts per day (weekend days tend higher; lazy approximation)
    v_appts_today := 3 + floor(random() * 8)::int;
    if v_dow in (5, 6) then v_appts_today := v_appts_today + 2; end if;

    for v_attempt in 1..v_appts_today loop
      v_barber_id := v_barber_ids[1 + floor(random() * array_length(v_barber_ids, 1))::int];

      -- weighted service pick
      v_weight_pick := 1 + floor(random() * v_weight_total)::int;
      v_acc := 0;
      v_service_idx := 1;
      for v_i in 1..array_length(v_service_weights, 1) loop
        v_acc := v_acc + v_service_weights[v_i];
        if v_weight_pick <= v_acc then
          v_service_idx := v_i;
          exit;
        end if;
      end loop;
      v_service_id := v_service_ids[v_service_idx];
      v_duration   := v_service_minutes[v_service_idx];

      v_cust_idx := 1 + floor(random() * array_length(v_names, 1))::int;

      -- Hour 9-18 (or shop hours range), minute 0/15/30/45 (mostly :00 or :30)
      v_hour := extract(hour from v_open_time)::int
              + floor(random() *
                 (extract(hour from v_close_time)::int - extract(hour from v_open_time)::int)
              )::int;
      v_minute := (array[0, 0, 30, 30, 15, 45])[1 + floor(random() * 6)::int];

      v_starts_at := ((current_date - v_day_offset)::timestamp
                      + make_interval(hours => v_hour, mins => v_minute))
                     at time zone v_tz;
      v_ends_at   := v_starts_at + make_interval(mins => v_duration);

      -- Don't generate past appts in the future
      if v_starts_at >= now() then continue; end if;

      -- 90% completed, 7% cancelled, 3% no_show
      v_status := case
        when random() < 0.90 then 'completed'
        when random() < 0.97 then 'cancelled'
        else 'no_show'
      end;

      v_note := v_notes_pool[1 + floor(random() * array_length(v_notes_pool, 1))::int];

      -- Overlap guard
      if exists (
        select 1 from public.appointments
         where barber_id = v_barber_id
           and status <> 'cancelled'
           and tstzrange(starts_at, ends_at, '[)') &&
               tstzrange(v_starts_at, v_ends_at, '[)')
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      insert into public.appointments
        (barber_id, service_id, customer_name, customer_phone,
         starts_at, ends_at, status, notes, reminder_sent_at)
      values
        (v_barber_id, v_service_id,
         v_names[v_cust_idx], v_phones[v_cust_idx],
         v_starts_at, v_ends_at, v_status, v_note,
         case when v_status = 'completed'
              then v_starts_at - interval '24 hours'
              else null
         end);
      v_inserted_past := v_inserted_past + 1;
    end loop;
  end loop;

  -- ---------------------------------------------------------------------------
  -- FUTURE 14 days
  -- ---------------------------------------------------------------------------
  for v_day_offset in 1..14 loop
    v_dow := extract(dow from (current_date + v_day_offset))::int;
    select open_time, close_time into v_open_time, v_close_time
      from public.shop_hours where day_of_week = v_dow and not closed;
    if v_open_time is null then
      continue;
    end if;

    v_appts_today := 1 + floor(random() * 5)::int;
    if v_dow in (5, 6) then v_appts_today := v_appts_today + 2; end if;

    for v_attempt in 1..v_appts_today loop
      v_barber_id := v_barber_ids[1 + floor(random() * array_length(v_barber_ids, 1))::int];

      v_weight_pick := 1 + floor(random() * v_weight_total)::int;
      v_acc := 0;
      v_service_idx := 1;
      for v_i in 1..array_length(v_service_weights, 1) loop
        v_acc := v_acc + v_service_weights[v_i];
        if v_weight_pick <= v_acc then
          v_service_idx := v_i;
          exit;
        end if;
      end loop;
      v_service_id := v_service_ids[v_service_idx];
      v_duration   := v_service_minutes[v_service_idx];

      v_cust_idx := 1 + floor(random() * array_length(v_names, 1))::int;

      v_hour := extract(hour from v_open_time)::int
              + floor(random() *
                 (extract(hour from v_close_time)::int - extract(hour from v_open_time)::int)
              )::int;
      v_minute := (array[0, 0, 30, 30, 15, 45])[1 + floor(random() * 6)::int];

      v_starts_at := ((current_date + v_day_offset)::timestamp
                      + make_interval(hours => v_hour, mins => v_minute))
                     at time zone v_tz;
      v_ends_at   := v_starts_at + make_interval(mins => v_duration);

      if v_starts_at <= now() then continue; end if;

      v_note := v_notes_pool[1 + floor(random() * array_length(v_notes_pool, 1))::int];

      if exists (
        select 1 from public.appointments
         where barber_id = v_barber_id
           and status <> 'cancelled'
           and tstzrange(starts_at, ends_at, '[)') &&
               tstzrange(v_starts_at, v_ends_at, '[)')
      ) then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      insert into public.appointments
        (barber_id, service_id, customer_name, customer_phone,
         starts_at, ends_at, status, notes)
      values
        (v_barber_id, v_service_id,
         v_names[v_cust_idx], v_phones[v_cust_idx],
         v_starts_at, v_ends_at, 'confirmed', v_note);
      v_inserted_future := v_inserted_future + 1;
    end loop;
  end loop;

  raise notice
    'Bulk seed done: % past, % upcoming inserted (% skipped overlaps). Total rows: %',
    v_inserted_past, v_inserted_future, v_skipped,
    (select count(*) from public.appointments);
end $$;
