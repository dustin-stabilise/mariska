# Care Introduction Platform

A UK self-employed care & nursing introduction marketplace (working design name
"Kindred" — final brand TBD, swappable in `src/lib/brand.ts`). Clients search
vetted carers and nurses, unlock full profiles with credits, book interviews
through the platform, and engage professionals directly. The agency verifies
documents and runs automated compliance.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage, RLS) ·
Stripe (plumbing-ready) · Tailwind v4 · Vercel.

## Local development

Prereqs: Node 22+ (`.nvmrc` says 26), pnpm, Docker (for local Supabase),
Supabase CLI.

```bash
pnpm install
supabase start          # local stack (custom ports 543xx — see supabase/config.toml)
cp .env.example .env.local   # then fill from `supabase status` output
pnpm seed               # demo users + 6 searchable professionals
pnpm dev
```

Demo logins (password `password123`):

| Role | Email |
| --- | --- |
| Agency admin | `admin@example.com` |
| Client (5 credits) | `client@example.com` |
| Carer | `grace.carer@example.com` (+ tom, maria, james) |
| Nurse | `amara.nurse@example.com`, `sofia.nurse@example.com` |

## Payments — test bypass mode

Stripe is fully plumbed (Checkout for credit packs & interview fees,
subscription for the retainer, webhook fulfilment) but the Stripe account
doesn't exist yet. **When `STRIPE_SECRET_KEY` is unset, every checkout runs in
test-bypass mode**: the payment row is recorded with `provider = 'test_bypass'`
and fulfilled instantly, so all flows work end-to-end.

Go-live checklist (once the Stripe account exists):
1. Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. Add a webhook endpoint `https://<domain>/api/webhooks/stripe` for
   `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.deleted`; set `STRIPE_WEBHOOK_SECRET`.
3. No code changes — prices are inline (`src/lib/pricing.ts`), no dashboard
   products needed.

## Business rules in one place

- Pricing: `src/lib/pricing.ts` (credits 5/£25, interview £15, placement
  £350 carer / £650 nurse, retainer £50/mo incl. 5 credits, referrals
  £25/£50/£75, unlocks last 30 days).
- Compliance scoring & search visibility: `supabase/migrations/*init_schema.sql`
  (`compute_compliance`, `professional_cards` view). Red or stale-availability
  profiles drop out of search automatically.
- Daily compliance cron: `/api/cron/compliance` (Vercel Cron, `CRON_SECRET`
  bearer auth) — expiry reminders at 60/30/7 days + availability nudges,
  logged in `reminder_log`.

## Deploying to Vercel

1. Create a hosted Supabase project; run `supabase link` + `supabase db push`.
2. Set env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` (and Stripe vars when live).
3. `vercel deploy` — `vercel.json` schedules the compliance cron.

## Repo map

```
src/lib/brand.ts            swappable brand config (name/colours/contacts)
src/lib/pricing.ts          all prices, pence
src/lib/supabase/           browser/server/admin clients + generated types
src/lib/payments/           checkout + fulfilment + Stripe webhook logic
src/lib/actions/            server actions (auth, marketplace, pro, admin)
src/app/(marketing)/        public site (home, how-it-works, for-carers)
src/app/(auth)/             login, client signup, professional application
src/app/app/                authed app: client / pro / admin areas
supabase/migrations/        schema, RLS, functions, storage policies
scripts/seed.ts             local demo data
```
