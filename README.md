# Amazing Hair Design — Booking Site

Marketing + online booking for [Amazing Hair Design](https://www.yelp.com/biz/amazing-hair-design-westminster) in Westminster, CA. Built with Next.js, Supabase, and Vercel.

## Stack

- **Next.js 16** (App Router, Server Actions, React 19)
- **Tailwind v4** + **shadcn/ui** (base-nova style)
- **Supabase** — Postgres, Auth (admin only), Storage (gallery photos), RLS
- **Twilio** — SMS OTP for `/my-bookings`
- **Vercel** — hosting

## Local setup

```powershell
# 1. Install deps
pnpm install

# 2. Copy env template and fill it in
Copy-Item .env.local.example .env.local
# Then edit .env.local with your Supabase / Twilio keys.

# 3. Apply DB schema + seed in your Supabase project
#    Paste these into the SQL editor at supabase.com, in order:
#      supabase/migrations/0001_init.sql       # required — base schema + RLS
#      supabase/migrations/0002_translations.sql # required — i18n overrides
#      supabase/migrations/0003_drop_email.sql # required — drops customer_email
#      supabase/seed.sql                       # required — barbers, services, hours
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

## Admin setup

1. In Supabase Studio → **Authentication** → **Users**, create a user with email + password for the shop owner (e.g. Tommy).
2. Add that email to `ALLOWED_ADMIN_EMAILS` in your `.env.local` (and on Vercel).
3. Sign in at `/admin/login`.

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Paste env vars from `.env.local` into Vercel's project settings.
4. Deploy.

### Twilio setup

OTP codes for `/my-bookings` are delivered by SMS. Required env vars:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE` — sender number in E.164 (e.g. `+15551234567`)

If any of these are missing, the app falls back to logging the code to the server console — useful for local dev but never deploy without them. New Twilio accounts get $15 trial credit (~2000 US SMS) but trial mode can only send to verified numbers. For production you'll need to buy a number and register either an A2P 10DLC campaign (long code) or a toll-free number with the carriers; otherwise messages will be blocked or filtered.

## Notes

- **Slot generation** lives in [src/lib/availability.ts](src/lib/availability.ts) — it's the most logic-heavy file. Slots are computed in the shop's timezone, on a 15-minute grid, and exclude existing appointments + time-off + past times.
- **Race-safe inserts** — bookings go through the `create_appointment_if_free` Postgres function, which checks overlaps inside the transaction.
- **RLS** — all marketing tables are publicly readable for active rows; `appointments`, `time_off`, `login_codes` have **no** public policies and are only accessed via Server Actions using the Supabase secret key (`sb_secret_...`).
- **OTP for `/my-bookings`** — 6-digit code is sent by SMS via Twilio to a phone number that already has a prior booking on file. Phone is the customer identity; we don't collect email.

## Out of scope for v1

- Online payment / deposits
- Confirmation / reminder SMS (out-of-band; customer self-serves at `/my-bookings`)
- Reviews/ratings (defer to Yelp/Google)
