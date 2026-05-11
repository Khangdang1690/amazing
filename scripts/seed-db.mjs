// Apply schema + seeds via direct Postgres connection.
// Run with:
//   node --env-file=.env.local scripts/seed-db.mjs
//
// Reads SUPABASE_DB_PASSWORD and the project URL from env, connects to
// Supabase's Postgres, and runs (in order):
//   supabase/migrations/0001_init.sql   -- schema + RLS + functions
//   supabase/seed.sql                   -- barbers, services, hours
//   supabase/seed-mock.sql              -- gallery + ~500 appointments
//
// All three files are idempotent on re-run (the migration uses CREATE TABLE
// without IF NOT EXISTS, so it will error if already applied — that's
// expected and the script reports it gracefully and continues).

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}
if (!dbUrl && !dbPassword) {
  console.error(
    "Need either SUPABASE_DB_URL (preferred) or SUPABASE_DB_PASSWORD in .env.local.",
  );
  process.exit(1);
}

const ref = new URL(supabaseUrl).hostname.split(".")[0];

// Build candidate connection configs. If SUPABASE_DB_URL is set, use it
// directly (single attempt). Otherwise probe every region + direct.
let candidates;
if (dbUrl) {
  candidates = [
    {
      label: `SUPABASE_DB_URL`,
      config: {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      },
    },
  ];
} else {
  const REGIONS = [
    "us-west-1", "us-west-2",
    "us-east-1", "us-east-2",
    "ca-central-1",
    "eu-west-1", "eu-west-2", "eu-west-3",
    "eu-central-1", "eu-central-2",
    "eu-north-1",
    "ap-southeast-1", "ap-southeast-2",
    "ap-northeast-1", "ap-northeast-2",
    "ap-south-1", "ap-south-2",
    "sa-east-1",
  ];
  // Try both aws-0 and aws-1 hostname numbers — Supabase added aws-1 for
  // newer projects in some regions.
  candidates = [];
  for (const num of [0, 1]) {
    for (const region of REGIONS) {
      candidates.push({
        label: `pooler (aws-${num}-${region}, session)`,
        config: {
          host: `aws-${num}-${region}.pooler.supabase.com`,
          port: 5432,
          user: `postgres.${ref}`,
          password: dbPassword,
          database: "postgres",
          ssl: { rejectUnauthorized: false },
        },
      });
    }
  }
  candidates.push({
    label: "direct (IPv4 only — likely fails on new projects)",
    config: {
      host: `db.${ref}.supabase.co`,
      port: 5432,
      user: "postgres",
      password: dbPassword,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
    },
  });
}

async function connect() {
  for (const c of candidates) {
    const client = new Client({ ...c.config, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      console.log(`Connected via ${c.label} (${c.config.host}).`);
      return client;
    } catch (e) {
      const msg = e.message ?? String(e);
      const isAuthFail = /password authentication failed/i.test(msg);
      console.log(`  ${c.label}: [${e.code ?? "?"}] ${msg}`);
      try { await client.end(); } catch {}
      // If we got an auth failure, the password is wrong — bail early.
      if (isAuthFail) {
        throw new Error(
          "Password authentication failed. Check SUPABASE_DB_PASSWORD in .env.local.",
        );
      }
    }
  }
  throw new Error("Could not connect to Postgres on any candidate host.");
}

async function runFile(client, path, label) {
  const fullPath = resolve(repoRoot, path);
  const sql = await readFile(fullPath, "utf-8");
  console.log(`\n── Running ${label} (${path})`);
  try {
    await client.query(sql);
    console.log(`✓ ${label} OK`);
    return { ok: true };
  } catch (e) {
    // For the migration: "already exists" errors mean schema was applied before — fine.
    const alreadyApplied =
      /already exists/i.test(e.message) ||
      e.code === "42P07" ||  // duplicate_table
      e.code === "42710";    // duplicate_object
    if (alreadyApplied && label === "migration") {
      console.log(`! ${label} already applied — continuing.`);
      return { ok: true, skipped: true };
    }
    console.error(`✗ ${label} failed:`, e.message);
    if (e.position) console.error(`  near position ${e.position}`);
    return { ok: false, error: e };
  }
}

(async () => {
  console.log(`Target: ${supabaseUrl}`);
  console.log("Connecting…");
  const client = await connect();

  try {
    const r1 = await runFile(client, "supabase/migrations/0001_init.sql", "migration");
    if (!r1.ok) throw r1.error;

    const r2 = await runFile(client, "supabase/seed.sql", "base seed");
    if (!r2.ok) throw r2.error;

    const r3 = await runFile(client, "supabase/seed-mock.sql", "mock seed");
    if (!r3.ok) throw r3.error;

    // Final counts
    const counts = await client.query(`
      select
        (select count(*) from public.barbers)         as barbers,
        (select count(*) from public.services)        as services,
        (select count(*) from public.shop_hours)      as hours,
        (select count(*) from public.gallery_photos)  as gallery,
        (select count(*) from public.appointments)    as appointments,
        (select count(*) from public.appointments where status = 'confirmed' and starts_at > now()) as upcoming,
        (select count(*) from public.appointments where status = 'completed') as completed,
        (select count(distinct customer_phone) from public.appointments) as unique_customers
    `);
    const c = counts.rows[0];
    console.log("\nFinal counts:");
    console.log(`  barbers:           ${c.barbers}`);
    console.log(`  services:          ${c.services}`);
    console.log(`  shop_hours:        ${c.hours}`);
    console.log(`  gallery_photos:    ${c.gallery}`);
    console.log(`  appointments:      ${c.appointments}`);
    console.log(`    → upcoming:      ${c.upcoming}`);
    console.log(`    → completed:     ${c.completed}`);
    console.log(`  unique customers:  ${c.unique_customers}`);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error("\nSeed failed:", e.message ?? e);
  process.exit(1);
});
