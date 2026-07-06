# DR-0001 — Revenue model: on-platform commission, not introduction fees

- **Date:** 2026-07-06
- **Status:** Accepted
- **Review Date:** 2026-10-04

## Context

The original business plan (CareMatch.docx) specified an introduction-fee
model: clients buy profile-unlock credits (5 for £25), pay £15 per interview
request, pay a one-off introduction fee on engagement (£350 carer / £650
nurse), optionally subscribe to a £50/mo support retainer — and all ongoing
care payments happen directly between client and carer, off-platform. The v1
platform was built and deployed to production (2026-07-06) on this model, with
Stripe plumbing in test-bypass mode and zero users.

Competitor research across 14 UK care marketplaces (Docs/research/competitors/,
2026-07-05) found that every surviving direct marketplace intermediates
payments and takes a commission — Curam (~24% blended: 15% carer + 12% client),
TrustonTap (~23%: 18% carer + 5% family), PrimeCarers (12.5–20% carer-side) —
while both defunct precedents are autopsied as transaction-ownership failures:
SuperCarers (the closest model analogue, sold 2020, marketplace shut) and
Care Sourcer (free matcher, never owned the transaction, dissolved 2025).
The one-off model caps lifetime revenue at £350–650 per client, while
commission on a £1,200/week live-in placement recurs for the life of the care
relationship. The decision was forced now because the platform has no users
yet: pricing pivots only get more expensive from here.

## Decision

Adopt a dual-sided commission model with payments intermediated on-platform:
carers set their own rates, clients pay through the platform (Stripe Connect),
and the platform takes approximately 15% from the carer side plus 5–8% from the
client side (≤20–24% blended, matching the field-tested norm). The
introduction-fee monetisation (credit packs, £15 interview fees, £350/£650
placement fees, £50/mo retainer) is retired as the primary revenue model.

## Options Considered

- **Commission, on-platform (chosen)** — matches every surviving competitor;
  recurring revenue per care relationship; enables the anti-disintermediation
  bundle (platform-hours insurance, fast payouts, replacement access). Cons:
  requires a bookings/timesheets/payouts build (Stripe Connect onboarding for
  carers, weekly payouts, disputes); revenue arrives only as care hours flow;
  delays launch relative to shipping what is already built.
- **Keep introduction fees (as built)** — zero additional build, immediate
  per-placement revenue, no payment-ops burden. Cons: the two documented
  marketplace deaths ran exactly this shape; lifetime revenue capped at the
  one-off fee; £350/£650 upfront is a high conversion barrier; nothing binds
  the ongoing relationship to the platform.
- **Staged (intro fees now → commission v2)** — validates supply/demand with
  the existing build. Cons: off-platform payment habits form immediately and
  are hard to migrate; two pricing migrations; the research shows the habit
  window is the danger (Country Cousins' churn once family and carer know
  each other).

## The Critical Assumption

Care relationships will transact through the platform rather than around it —
i.e., at a ≤20–24% blended take paired with genuine value (fast carer payouts,
platform-hours insurance, replacement-carer access, invoicing/records), enough
clients and carers keep payments on-platform for cumulative commission per
relationship to exceed the £350/£650 a one-off introduction fee would have
captured.

## Early Warning Signs

- Carers and clients complete an introduction, then bookings flatline while
  both accounts stay active (payments moved off-platform).
- Carer signups stall specifically at the Stripe Connect onboarding step.
- Repeat-booking rate per matched pair falls off within the first month
  (commission never accumulates past the foregone one-off fee).
- Client-side fee resistance: quote acceptance drops when the +5–8% client fee
  is surfaced at checkout.
- Support load from payout disputes/chargebacks grows faster than booking
  volume.

## Consequences

- **Easier:** recruiting carers ("set your rate, keep ~85%, paid weekly" — the
  category's proven pitch); honest "lowest fees" positioning against
  PrimeCarers' 20% hourly tier; radical price transparency (all-in price on
  every profile); building the anti-disintermediation bundle; recurring,
  compounding revenue.
- **Harder / new build:** bookings + timesheets/visit-confirmation layer,
  Stripe Connect Express onboarding and weekly payouts, commission and VAT
  handling, dispute/refund flows, a circumvention policy (~£1,000, Curam-level,
  carrot-first). Marketing copy and how-it-works flow need rewriting around
  booking rather than unlocking.
- **Repurposed, not wasted:** the payments/test-bypass plumbing, compliance
  engine, search, profiles, dashboards and RLS model all carry over. Credits/
  unlock and interview-fee code paths remain in the codebase but are
  de-emphasised pending removal or repurposing (e.g. free contact, paid
  featured placement) — final disposition decided during the bookings build.
- **Commitment:** revenue now depends on reaching real care-hours liquidity in
  a launch region; the research's density lesson (launch hyperlocal, expand
  behind supply) becomes binding rather than advisory.

## Outcome (filled in at review)

