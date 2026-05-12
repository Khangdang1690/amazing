// Create the admin user via Supabase Auth admin API.
// Run with:
//   node --env-file=.env.local scripts/create-admin.mjs
//
// Picks the first email from ALLOWED_ADMIN_EMAILS. If the user already
// exists, generates a fresh password and resets it. Prints credentials
// to stdout — write them down or rotate later in the dashboard.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const allowed = (process.env.ALLOWED_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}
if (allowed.length === 0) {
  console.error("ALLOWED_ADMIN_EMAILS is empty in .env.local.");
  process.exit(1);
}

const email = allowed[0];
const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Memorable + strong: 4 lowercase chunks + 2 digits, e.g. "tide-stout-lift-vine-83"
function generatePassword() {
  const words = [
    "amber","arrow","ash","aspen","azure","bark","basin","beam","birch","brass",
    "brick","brook","cedar","clay","cliff","clove","coast","cobalt","copper","cove",
    "crag","crest","dawn","drift","dune","dusk","ember","fern","flax","flint",
    "forge","frost","gale","glade","glen","glint","grain","grove","gulch","hail",
    "harbor","haven","hawk","heath","hill","hue","ivy","jade","kelp","lark",
    "leaf","lift","loam","lodge","loon","loop","mist","moss","oak","onyx",
    "opal","oxide","pearl","peat","pier","pine","plume","quill","reed","ridge",
    "rim","rose","rust","sage","salt","sand","shale","shore","silt","slate",
    "snow","spire","spruce","stem","stoat","stone","stout","stream","sun","tide",
    "trail","tundra","vale","vane","verge","vine","wave","wheat","wind","wood"
  ];
  const w = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(words[randomBytes(2).readUInt16BE(0) % words.length]);
    }
    return out;
  };
  const num = String(randomBytes(1)[0] % 100).padStart(2, "0");
  return `${w(4).join("-")}-${num}`;
}

const password = generatePassword();

// Try to create. If user already exists, update password instead.
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

let userId;
if (createErr && /already been registered|already registered|exists/i.test(createErr.message)) {
  // Look up by email and update
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error("User exists per error but not found in list:", createErr.message);
    process.exit(2);
  }
  userId = existing.id;
  const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (updErr) {
    console.error("Failed to reset password:", updErr.message);
    process.exit(2);
  }
  console.log(`\n✓ Updated existing admin user (id ${userId.slice(0, 8)}…)`);
} else if (createErr) {
  console.error("Failed to create admin user:", createErr.message);
  process.exit(2);
} else {
  userId = created.user?.id;
  console.log(`\n✓ Created admin user (id ${userId?.slice(0, 8)}…)`);
}

console.log("\n────────── ADMIN LOGIN ──────────");
console.log(`  URL:      ${url.replace(".supabase.co", "")} → /admin/login`);
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
console.log("─────────────────────────────────");
console.log("\nWrite this down. You can rotate the password later in");
console.log("Supabase Studio → Authentication → Users.");
