# Amazing Hair Design — Booking Site

Marketing + online booking for [Amazing Hair Design](https://www.yelp.com/biz/amazing-hair-design-westminster) in Westminster, CA. Built with Next.js, Supabase, and Vercel.

## Stack

- **Next.js 16** (App Router, Server Actions, React 19)
- **Tailwind v4** + **shadcn/ui** (base-nova style)
- **Supabase** — Postgres, Auth (admin only), Storage (gallery photos), RLS
- **Resend** — transactional email
- **Vercel** — hosting + Cron

## Local setup

```powershell
# 1. Install deps
pnpm install

# 2. Copy env template and fill it in
Copy-Item .env.local.example .env.local
# Then edit .env.local with your Supabase / Resend keys.

# 3. Apply DB schema + seed in your Supabase project
#    Paste these into the SQL editor at supabase.com, in order:
#      supabase/migrations/0001_init.sql   # required — schema + RLS
#      supabase/seed.sql                   # required — barbers, services, hours
#      supabase/seed-mock.sql              # optional — 8 gallery photos +
#                                          # ~500 realistic appointments
#                                          # spread across 90 days past +
#                                          # 14 days upcoming. Demo only —
#                                          # skip on real launch.

# 4. Run the dev server
pnpm dev
```

Open <http://localhost:3000>.

## Routes

| URL | Purpose |
|---|---|
| `/` | Landing: hero, services, barbers, gallery preview, hours, map |
| `/services` | Full services + pricing |
| `/gallery` | Curated photos + Instagram link |
| `/contact` | Map, hours, click-to-call, walk-in policy |
| `/book` | Step 1: choose barber |
| `/book/[slug]` | Step 2: pick service, date, time |
| `/book/[slug]/confirm` | Step 3: enter details, submit |
| `/book/success?id=…` | Confirmation + add to calendar |
| `/my-bookings` | Phone-OTP sign in, list bookings, one-tap rebook |
| `/admin` | Today's appointments (auth required) |
| `/admin/appointments` | All appointments with filters |
| `/admin/barbers` | CRUD barbers |
| `/admin/services` | CRUD services |
| `/admin/hours` | Weekly hours + time-off |
| `/admin/gallery` | Upload/delete gallery photos |
| `/admin/login` | Sign in |
| `/api/cron/reminders` | Daily cron — emails reminders for next-day appointments |

## Admin setup

1. In Supabase Studio → **Authentication** → **Users**, create a user with email + password for the shop owner (e.g. Tommy).
2. Add that email to `ALLOWED_ADMIN_EMAILS` in your `.env.local` (and on Vercel).
3. Sign in at `/admin/login`.

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Paste env vars from `.env.local` into Vercel's project settings.
4. Deploy. Vercel will register the cron from `vercel.json` automatically.

### Resend setup

The free tier covers 3,000 emails/month, which is plenty. Initially, send from Resend's onboarding domain (`onboarding@resend.dev`). To send from your own domain (e.g. `bookings@amazinghair.com`), verify the domain in Resend and update `RESEND_FROM_EMAIL`.

## Notes

- **Slot generation** lives in [src/lib/availability.ts](src/lib/availability.ts) — it's the most logic-heavy file. Slots are computed in the shop's timezone, on a 15-minute grid, and exclude existing appointments + time-off + past times.
- **Race-safe inserts** — bookings go through the `create_appointment_if_free` Postgres function, which checks overlaps inside the transaction.
- **RLS** — all marketing tables are publicly readable for active rows; `appointments`, `time_off`, `login_codes` have **no** public policies and are only accessed via Server Actions using the Supabase secret key (`sb_secret_...`).
- **OTP for `/my-bookings`** — codes are sent via email (we already have the customer's email from their last booking; cheaper than SMS).

## Out of scope for v1

- Online payment / deposits
- SMS reminders (use email instead)
- Multi-language (Westminster has a large Vietnamese-speaking community — consider for v2)
- Reviews/ratings (defer to Yelp/Google)
