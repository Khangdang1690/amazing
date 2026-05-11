// Mock-data seeder. Run with:
//   node --env-file=.env.local scripts/seed-mock.mjs
//
// Inserts gallery photos and ~540 realistic appointments (40 hand-written +
// ~500 bulk-generated) for the Amazing Hair Design demo. Idempotent: re-runs
// are safe (each block guards itself).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  console.error("Run with:  node --env-file=.env.local scripts/seed-mock.mjs");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// =============================================================================
// Helpers
// =============================================================================

const TZ = "America/Los_Angeles";

/** Build a Date for `daysOffset` days from today at `H:M` in shop TZ. */
function shopDateTime(daysOffset, hour, minute) {
  // Build a UTC instant that represents the wall-clock time in TZ.
  // Use Intl to find the TZ offset for that calendar date.
  const baseUTC = new Date();
  baseUTC.setUTCDate(baseUTC.getUTCDate() + daysOffset);
  const yyyy = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(baseUTC);
  const mm = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "2-digit" }).format(baseUTC);
  const dd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, day: "2-digit" }).format(baseUTC);
  // Determine the offset for the shop TZ at that date by parsing the long form.
  const tzString = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`));
  const offsetPart = tzString.find((p) => p.type === "timeZoneName")?.value ?? "GMT-08:00";
  const sign = offsetPart.includes("-") ? "-" : "+";
  const m = offsetPart.match(/(\d{2}):(\d{2})/);
  const offH = m ? Number(m[1]) : 8;
  const offM = m ? Number(m[2]) : 0;
  const offset = `${sign}${String(offH).padStart(2, "0")}:${String(offM).padStart(2, "0")}`;
  const iso = `${yyyy}-${mm}-${dd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`;
  return new Date(iso);
}

function dayOfWeekShopTz(daysOffset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  // Get weekday in shop TZ (returns 'Sun'..'Sat').
  const wk = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wk);
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60_000);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weighted(items) {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of items) {
    r -= x.weight;
    if (r <= 0) return x.value;
  }
  return items[items.length - 1].value;
}

async function chunkInsert(table, rows, size = 200) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    const { error } = await supabase.from(table).insert(slice);
    if (error) {
      console.error(`Insert into ${table} failed at chunk ${i}:`, error);
      throw error;
    }
    inserted += slice.length;
  }
  return inserted;
}

// =============================================================================
// Step 1: verify schema exists
// =============================================================================

async function verifySchema() {
  // `head: true` can return a null count without setting `error` when the
  // schema cache hasn't seen the table; do an actual row fetch.
  const { error } = await supabase.from("barbers").select("id").limit(1);
  if (error) {
    if (error.code === "PGRST205" || /schema cache|does not exist/i.test(error.message)) {
      console.error(
        "\nThe `barbers` table doesn't exist yet — schema isn't applied.\n\n" +
          "Paste supabase/migrations/0001_init.sql into the SQL editor and run it:\n" +
          `  https://supabase.com/dashboard/project/${new URL(url).hostname.split(".")[0]}/sql/new\n\n` +
          "Then re-run this script.\n",
      );
    } else {
      console.error("\nCould not query barbers table:", error);
    }
    process.exit(2);
  }
}

// =============================================================================
// Step 2: seed barbers / services / hours / barber_services
// =============================================================================

async function seedBaseIfEmpty() {
  const { count } = await supabase.from("barbers").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`[base] ${count} barbers already present — skipping base seed.`);
    return;
  }

  console.log("[base] Seeding barbers, services, hours, barber_services…");

  const { data: barbers, error: barberErr } = await supabase
    .from("barbers")
    .insert([
      { name: "Tommy", slug: "tommy", bio: "Owner & master barber. Follow on Instagram @tommyamazinghair for the latest work.", active: true, display_order: 0 },
      { name: "Andy",  slug: "andy",  bio: "Specializes in fades, tapers, and classic cuts.", active: true, display_order: 1 },
      { name: "Kevin", slug: "kevin", bio: "Kids cuts and beard trims a specialty.", active: true, display_order: 2 },
    ])
    .select("id, slug");
  if (barberErr) throw barberErr;

  const { data: services, error: serviceErr } = await supabase
    .from("services")
    .insert([
      { name: "Men's Haircut",        description: "Classic cut, wash, and style.",                       duration_minutes: 30, price_cents: 3500, display_order: 0 },
      { name: "Fade",                 description: "Skin, low, mid, or high fade. Precision tapering.", duration_minutes: 45, price_cents: 4000, display_order: 1 },
      { name: "Kids Cut",             description: "For ages 12 and under.",                              duration_minutes: 30, price_cents: 2500, display_order: 2 },
      { name: "Beard Trim",           description: "Shape-up and line work.",                             duration_minutes: 20, price_cents: 2000, display_order: 3 },
      { name: "Hot Towel Shave",      description: "Traditional straight-razor shave with hot towel.",   duration_minutes: 45, price_cents: 4000, display_order: 4 },
      { name: "Haircut + Beard Combo",description: "Full cut paired with beard shaping.",                 duration_minutes: 50, price_cents: 5000, display_order: 5 },
      { name: "Senior Cut",           description: "For guests 60+.",                                     duration_minutes: 30, price_cents: 2500, display_order: 6 },
    ])
    .select("id");
  if (serviceErr) throw serviceErr;

  // Link every barber to every service
  const links = [];
  for (const b of barbers) {
    for (const s of services) {
      links.push({ barber_id: b.id, service_id: s.id });
    }
  }
  const { error: linkErr } = await supabase.from("barber_services").insert(links);
  if (linkErr) throw linkErr;

  // Shop hours (upsert in case partial state)
  const { error: hoursErr } = await supabase.from("shop_hours").upsert(
    [
      { day_of_week: 0, open_time: "10:00", close_time: "17:00", closed: false }, // Sun
      { day_of_week: 1, open_time: null,    close_time: null,    closed: true  }, // Mon closed
      { day_of_week: 2, open_time: "09:00", close_time: "19:00", closed: false }, // Tue
      { day_of_week: 3, open_time: "09:00", close_time: "19:00", closed: false }, // Wed
      { day_of_week: 4, open_time: "09:00", close_time: "19:00", closed: false }, // Thu
      { day_of_week: 5, open_time: "09:00", close_time: "19:00", closed: false }, // Fri
      { day_of_week: 6, open_time: "09:00", close_time: "19:00", closed: false }, // Sat
    ],
    { onConflict: "day_of_week" },
  );
  if (hoursErr) throw hoursErr;

  console.log(`[base] ✓ ${barbers.length} barbers, ${services.length} services, ${links.length} barber_services rows, 7 hour rows.`);
}

// =============================================================================
// Step 3: gallery
// =============================================================================

const GALLERY = [
  ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80", "Mid skin fade — finished",            0],
  ["https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=80", "Crisp line-up",                       1],
  ["https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&q=80", "Tommy at the chair",                  2],
  ["https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&q=80", "Classic taper with beard work",       3],
  ["https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900&q=80", "Clippers in motion",                  4],
  ["https://images.unsplash.com/photo-1635273051937-c0277a72e0e4?w=900&q=80", "Hot towel before the shave",          5],
  ["https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=900&q=80", "Detail on the temple",                6],
  ["https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=900&q=80", "Shop, late afternoon",                7],
];

async function seedGallery() {
  const { data: existing } = await supabase.from("gallery_photos").select("storage_path");
  const have = new Set((existing ?? []).map((r) => r.storage_path));
  const rows = GALLERY.filter(([url]) => !have.has(url)).map(([url, caption, order]) => ({
    storage_path: url,
    caption,
    display_order: order,
  }));
  if (rows.length === 0) {
    console.log("[gallery] Already seeded — skipping.");
    return;
  }
  const { error } = await supabase.from("gallery_photos").insert(rows);
  if (error) throw error;
  console.log(`[gallery] ✓ ${rows.length} photos inserted.`);
}

// =============================================================================
// Step 4: story appointments (40)
// =============================================================================

async function seedStoryAppointments() {
  const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`[stories] ${count} appointments already present — skipping stories.`);
    return;
  }

  const barbers = await supabase.from("barbers").select("id, slug").then((r) => r.data ?? []);
  const services = await supabase.from("services").select("id, name, duration_minutes, price_cents").then((r) => r.data ?? []);

  const bs = Object.fromEntries(barbers.map((b) => [b.slug, b.id]));
  const ss = Object.fromEntries(services.map((s) => [s.name, s]));

  // [barberSlug, serviceName, name, phone, _email (unused), daysOffset, hour, minute, status, notes]
  const rows = [
    // Tommy past
    ["tommy", "Fade",                   "Tuan Pham",        "+17145550142", "tuan.pham@gmail.com",      -3,  11,  0, "completed", null],
    ["tommy", "Haircut + Beard Combo",  "David Kim",        "+17145550158", "davidkim@yahoo.com",       -5,  14, 30, "completed", null],
    ["tommy", "Men's Haircut",          "Mike Chen",        "+17145550199", "mike.chen213@gmail.com",   -7,  10,  0, "completed", "Same as last time — number 2 fade."],
    ["tommy", "Fade",                   "Bao Nguyen",       "+17145550221", "bao.n@hotmail.com",        -9,  16,  0, "completed", null],
    ["tommy", "Hot Towel Shave",        "Jose Garcia",      "+17145550244", "jose.garcia@gmail.com",   -11,  18,  0, "completed", null],
    ["tommy", "Fade",                   "Tuan Pham",        "+17145550142", "tuan.pham@gmail.com",     -14,  11,  0, "completed", null],
    ["tommy", "Fade",                   "Hieu Le",          "+17145550267", "hieu.le.92@gmail.com",    -17,  13,  0, "completed", null],
    ["tommy", "Men's Haircut",          "Marcus Johnson",   "+17145550283", "marcusj@yahoo.com",       -20,  17, 30, "completed", null],
    ["tommy", "Fade",                   "Andy Vu",          "+17145550311", "andyvu@gmail.com",        -22,  10, 30, "completed", "Tight skin fade on the sides."],
    ["tommy", "Beard Trim",             "Brian Nguyen",     "+17145550335", "brian.nguyen@gmail.com",  -24,  12, 30, "completed", null],
    ["tommy", "Haircut + Beard Combo",  "David Kim",        "+17145550158", "davidkim@yahoo.com",      -26,  14, 30, "completed", null],
    ["tommy", "Fade",                   "Carlos Rodriguez", "+17145550349", "crodriguez@yahoo.com",    -28,   9, 30, "cancelled", null],
    // Tommy upcoming
    ["tommy", "Fade",                   "Tony Park",        "+17145550372", "t.park@gmail.com",          1,  11,  0, "confirmed", null],
    ["tommy", "Men's Haircut",          "Linh Nguyen",      "+17145550388", "linh.nguyen@gmail.com",     3,  15,  0, "confirmed", "First time here — please ask before going short."],
    ["tommy", "Fade",                   "Tuan Pham",        "+17145550142", "tuan.pham@gmail.com",       5,  11,  0, "confirmed", "Same as always."],
    ["tommy", "Haircut + Beard Combo",  "Ryan Patel",       "+17145550401", "ryan.patel@gmail.com",      9,  13, 30, "confirmed", null],

    // Andy past
    ["andy",  "Fade",                   "Khanh Phan",       "+17145550417", "khanh.phan@gmail.com",     -2,  13,  0, "completed", null],
    ["andy",  "Men's Haircut",          "Daniel Ortiz",     "+17145550428", "danielortiz@yahoo.com",    -4,  17,  0, "completed", null],
    ["andy",  "Kids Cut",               "Eric Tran",        "+17145550433", "eric.tran@gmail.com",      -6,  11, 30, "completed", "8 years old, wiggly. Bring stickers!"],
    ["andy",  "Fade",                   "Kevin Smith",      "+17145550441", "ksmith.oc@gmail.com",      -8,  18, 30, "completed", null],
    ["andy",  "Men's Haircut",          "Hoang Le",         "+17145550457", "hoang.le@gmail.com",      -10,  14,  0, "completed", null],
    ["andy",  "Fade",                   "Khanh Phan",       "+17145550417", "khanh.phan@gmail.com",    -13,  13,  0, "completed", null],
    ["andy",  "Hot Towel Shave",        "Anthony Diaz",     "+17145550466", "a.diaz@yahoo.com",        -16,  16, 30, "no_show",   null],
    ["andy",  "Men's Haircut",          "Vincent Le",       "+17145550478", "vincentle@gmail.com",     -19,  12,  0, "completed", null],
    ["andy",  "Fade",                   "Steven Chen",      "+17145550481", "s.chen@gmail.com",        -23,  17,  0, "completed", null],
    ["andy",  "Kids Cut",               "Justin Pham",      "+17145550492", "justin.pham88@gmail.com", -25,  10,  0, "completed", null],
    // Andy upcoming
    ["andy",  "Men's Haircut",          "Daniel Ortiz",     "+17145550428", "danielortiz@yahoo.com",     2,  17,  0, "confirmed", null],
    ["andy",  "Fade",                   "Khanh Phan",       "+17145550417", "khanh.phan@gmail.com",      6,  13,  0, "confirmed", null],
    ["andy",  "Kids Cut",               "Eric Tran",        "+17145550433", "eric.tran@gmail.com",       8,  11, 30, "confirmed", "Birthday haircut!"],

    // Kevin past
    ["kevin", "Beard Trim",             "Anh Vu",           "+17145550502", "anh.vu@gmail.com",         -1,  15,  0, "completed", null],
    ["kevin", "Kids Cut",               "William Park",     "+17145550516", "wpark@gmail.com",          -3,  10, 30, "completed", null],
    ["kevin", "Men's Haircut",          "Christopher Tran", "+17145550533", "chris.tran@yahoo.com",     -6,  13,  0, "cancelled", null],
    ["kevin", "Senior Cut",             "Henry Nguyen",     "+17145550548", "henrynguyen@gmail.com",    -8,   9, 30, "completed", "Henry — regular. Just a clean-up."],
    ["kevin", "Fade",                   "Phong Doan",       "+17145550551", "phong.doan@gmail.com",    -12,  17, 30, "completed", null],
    ["kevin", "Beard Trim",             "Anh Vu",           "+17145550502", "anh.vu@gmail.com",        -15,  15,  0, "completed", null],
    ["kevin", "Kids Cut",               "Calvin Vo",        "+17145550569", "calvin.vo@gmail.com",     -18,  11,  0, "completed", null],
    ["kevin", "Senior Cut",             "Henry Nguyen",     "+17145550548", "henrynguyen@gmail.com",   -22,   9, 30, "completed", null],
    // Kevin upcoming
    ["kevin", "Senior Cut",             "Henry Nguyen",     "+17145550548", "henrynguyen@gmail.com",     4,   9, 30, "confirmed", null],
    ["kevin", "Fade",                   "Phong Doan",       "+17145550551", "phong.doan@gmail.com",      7,  17, 30, "confirmed", null],
    ["kevin", "Beard Trim",             "Anh Vu",           "+17145550502", "anh.vu@gmail.com",         12,  15,  0, "confirmed", null],
  ];

  const inserts = rows.map(([slug, svc, name, phone, , off, h, m, status, notes]) => {
    const startsAt = shopDateTime(off, h, m);
    const service = ss[svc];
    return {
      barber_id: bs[slug],
      service_id: service.id,
      customer_name: name,
      customer_phone: phone,
      starts_at: startsAt.toISOString(),
      ends_at: addMinutes(startsAt, service.duration_minutes).toISOString(),
      status,
      notes,
      reminder_sent_at: status === "completed" ? addMinutes(startsAt, -1440).toISOString() : null,
    };
  });

  const inserted = await chunkInsert("appointments", inserts);
  console.log(`[stories] ✓ ${inserted} story appointments inserted.`);
}

// =============================================================================
// Step 5: bulk generator (~500)
// =============================================================================

const NAMES_POOL = [
  ["Tuan Pham",        "+17145550142", "tuan.pham@gmail.com"],
  ["David Kim",        "+17145550158", "davidkim@yahoo.com"],
  ["Bao Nguyen",       "+17145550221", "bao.n@hotmail.com"],
  ["Hieu Le",          "+17145550267", "hieu.le.92@gmail.com"],
  ["Andy Vu",          "+17145550311", "andyvu@gmail.com"],
  ["Brian Nguyen",     "+17145550335", "brian.nguyen@gmail.com"],
  ["Tony Park",        "+17145550372", "t.park@gmail.com"],
  ["Linh Nguyen",      "+17145550388", "linh.nguyen@gmail.com"],
  ["Khanh Phan",       "+17145550417", "khanh.phan@gmail.com"],
  ["Hoang Le",         "+17145550457", "hoang.le@gmail.com"],
  ["Vincent Le",       "+17145550478", "vincentle@gmail.com"],
  ["Justin Pham",      "+17145550492", "justin.pham88@gmail.com"],
  ["Anh Vu",           "+17145550502", "anh.vu@gmail.com"],
  ["Henry Nguyen",     "+17145550548", "henrynguyen@gmail.com"],
  ["Phong Doan",       "+17145550551", "phong.doan@gmail.com"],
  ["Calvin Vo",        "+17145550569", "calvin.vo@gmail.com"],
  ["Eric Tran",        "+17145550433", "eric.tran@gmail.com"],
  ["Christopher Tran", "+17145550533", "chris.tran@yahoo.com"],
  ["William Park",     "+17145550516", "wpark@gmail.com"],
  ["Steven Chen",      "+17145550481", "s.chen@gmail.com"],
  ["Daniel Ortiz",     "+17145550428", "danielortiz@yahoo.com"],
  ["Jose Garcia",      "+17145550244", "jose.garcia@gmail.com"],
  ["Carlos Rodriguez", "+17145550349", "crodriguez@yahoo.com"],
  ["Ryan Patel",       "+17145550401", "ryan.patel@gmail.com"],
  ["Marcus Johnson",   "+17145550283", "marcusj@yahoo.com"],
  ["Mike Chen",        "+17145550199", "mike.chen213@gmail.com"],
  ["Anthony Diaz",     "+17145550466", "a.diaz@yahoo.com"],
  ["Kevin Smith",      "+17145550441", "ksmith.oc@gmail.com"],
  ["Minh Tran",        "+17145550612", "minh.t@gmail.com"],
  ["Hung Pham",        "+17145550627", "hungpham@yahoo.com"],
  ["Long Nguyen",      "+17145550633", "long.nguyen@hotmail.com"],
  ["Vy Le",            "+17145550648", "vy.le@gmail.com"],
  ["Tan Bui",          "+17145550651", "tanbui@gmail.com"],
  ["Kien Vo",          "+17145550666", "kien.vo@yahoo.com"],
  ["Quan Doan",        "+17145550672", "quan.doan@gmail.com"],
  ["Khoa Truong",      "+17145550684", "khoa.truong@gmail.com"],
  ["Duy Lam",          "+17145550691", "duylam@hotmail.com"],
  ["Sang Ho",          "+17145550708", "sang.ho@gmail.com"],
  ["Chi Dao",          "+17145550713", "chidao@yahoo.com"],
  ["Phu Mai",          "+17145550721", "phu.mai@gmail.com"],
  ["Eddie Kim",        "+17145550735", "eddiekim@icloud.com"],
  ["James Tran",       "+17145550748", "j.tran@gmail.com"],
  ["Alex Nguyen",      "+17145550752", "alex.nguyen@yahoo.com"],
  ["Patrick Park",     "+17145550766", "ppark@gmail.com"],
  ["Hai Nguyen",       "+17145550771", "hai.n@hotmail.com"],
  ["Phuc Tran",        "+17145550788", "phuc.tran@gmail.com"],
  ["Tuan Bui",         "+17145550794", "t.bui@yahoo.com"],
  ["Khang Doan",       "+17145550802", "khang.doan@gmail.com"],
  ["Cuong Vu",         "+17145550817", "cuongvu@gmail.com"],
  ["Trung Le",         "+17145550824", "trung.le@yahoo.com"],
  ["Brandon Chen",     "+17145550831", "brandon.chen@gmail.com"],
  ["Jacob Pham",       "+17145550842", "jacobpham@icloud.com"],
  ["Aaron Lin",        "+17145550857", "aaron.lin@gmail.com"],
  ["Ethan Vu",         "+17145550869", "ethan.vu@yahoo.com"],
  ["Owen Park",        "+17145550873", "owen.park@gmail.com"],
  ["Lucas Tran",       "+17145550881", "lucas.tran@gmail.com"],
  ["Jay Pham",         "+17145550894", "jay.p@gmail.com"],
  ["Nathan Le",        "+17145550902", "nathan.le@gmail.com"],
  ["Tim Nguyen",       "+17145550918", "timnguyen@yahoo.com"],
  ["Adam Hoang",       "+17145550927", "adam.hoang@gmail.com"],
];

const NOTES_POOL = [
  "Same as last time.",
  "Tight skin fade on the sides.",
  "Number 2 on the sides, scissors on top.",
  "Keeping it long on top, neat on the sides.",
  "First time — happy with whatever you recommend.",
  "Going short — like a 1 all around.",
  "Beard line-up too please.",
  "Got a wedding this weekend.",
  "Just a cleanup.",
  // Heavy weighting toward null
  null, null, null, null, null, null, null, null, null, null,
];

async function seedBulkAppointments() {
  const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 100) {
    console.log(`[bulk] ${count} appointments already present — skipping bulk.`);
    return;
  }

  const barbers = (await supabase.from("barbers").select("id, active").eq("active", true)).data ?? [];
  const services = (await supabase.from("services").select("id, name, duration_minutes").eq("active", true)).data ?? [];
  const hours = (await supabase.from("shop_hours").select("*")).data ?? [];
  const hoursByDow = Object.fromEntries(hours.map((h) => [h.day_of_week, h]));

  const SERVICE_WEIGHTS = {
    "Fade": 32,
    "Men's Haircut": 30,
    "Haircut + Beard Combo": 12,
    "Beard Trim": 10,
    "Hot Towel Shave": 7,
    "Kids Cut": 6,
    "Senior Cut": 3,
  };
  const weightedServices = services.map((s) => ({ value: s, weight: SERVICE_WEIGHTS[s.name] ?? 5 }));

  // Pull all existing (barber_id, [start, end)) windows so we can avoid overlaps.
  const { data: existing } = await supabase
    .from("appointments")
    .select("barber_id, starts_at, ends_at, status");
  const busy = new Map(); // barber_id → array of [startMs, endMs]
  for (const a of existing ?? []) {
    if (a.status === "cancelled") continue;
    if (!busy.has(a.barber_id)) busy.set(a.barber_id, []);
    busy.get(a.barber_id).push([
      new Date(a.starts_at).getTime(),
      new Date(a.ends_at).getTime(),
    ]);
  }

  const overlaps = (barberId, startMs, endMs) => {
    const arr = busy.get(barberId);
    if (!arr) return false;
    for (const [s, e] of arr) {
      if (startMs < e && endMs > s) return true;
    }
    return false;
  };
  const markBusy = (barberId, startMs, endMs) => {
    if (!busy.has(barberId)) busy.set(barberId, []);
    busy.get(barberId).push([startMs, endMs]);
  };

  const inserts = [];
  const minuteChoices = [0, 0, 30, 30, 15, 45];
  const now = Date.now();

  function genForOffset(daysOffset, perDayBase, isFuture) {
    const dow = dayOfWeekShopTz(daysOffset);
    const h = hoursByDow[dow];
    if (!h || h.closed || !h.open_time || !h.close_time) return;
    const openHour = parseInt(h.open_time.slice(0, 2), 10);
    const closeHour = parseInt(h.close_time.slice(0, 2), 10);
    if (closeHour <= openHour) return;

    let appts = perDayBase + Math.floor(Math.random() * 5);
    if (dow === 5 || dow === 6) appts += 2; // Fri/Sat busier

    for (let i = 0; i < appts; i++) {
      const barber = pick(barbers);
      const service = weighted(weightedServices);
      const hr = openHour + Math.floor(Math.random() * (closeHour - openHour));
      const mn = pick(minuteChoices);

      const startsAt = shopDateTime(daysOffset, hr, mn);
      const startMs = startsAt.getTime();
      const endMs = startMs + service.duration_minutes * 60_000;

      if (isFuture && startMs <= now) continue;
      if (!isFuture && startMs >= now) continue;
      if (overlaps(barber.id, startMs, endMs)) continue;
      markBusy(barber.id, startMs, endMs);

      const customer = pick(NAMES_POOL);
      const status = isFuture
        ? "confirmed"
        : Math.random() < 0.9
          ? "completed"
          : Math.random() < 0.7
            ? "cancelled"
            : "no_show";
      const notes = pick(NOTES_POOL);

      inserts.push({
        barber_id: barber.id,
        service_id: service.id,
        customer_name: customer[0],
        customer_phone: customer[1],
        starts_at: new Date(startMs).toISOString(),
        ends_at: new Date(endMs).toISOString(),
        status,
        notes,
        reminder_sent_at:
          status === "completed"
            ? new Date(startMs - 24 * 60 * 60 * 1000).toISOString()
            : null,
      });
    }
  }

  for (let d = 1; d <= 90; d++) genForOffset(-d, 3, false); // past
  for (let d = 1; d <= 14; d++) genForOffset(d, 1, true); // future

  const inserted = await chunkInsert("appointments", inserts);
  console.log(`[bulk] ✓ ${inserted} bulk appointments inserted.`);
}

// =============================================================================
// Run
// =============================================================================

(async () => {
  console.log(`Seeding ${url}\n`);
  await verifySchema();
  await seedBaseIfEmpty();
  await seedGallery();
  await seedStoryAppointments();
  await seedBulkAppointments();

  const counts = await Promise.all([
    supabase.from("barbers").select("*", { count: "exact", head: true }),
    supabase.from("services").select("*", { count: "exact", head: true }),
    supabase.from("gallery_photos").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
  ]);
  console.log("\nFinal counts:");
  console.log(`  barbers:        ${counts[0].count}`);
  console.log(`  services:       ${counts[1].count}`);
  console.log(`  gallery_photos: ${counts[2].count}`);
  console.log(`  appointments:   ${counts[3].count}`);
})().catch((e) => {
  console.error("\nSeed failed:", e);
  process.exit(1);
});
