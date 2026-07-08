# Roadmap v2 — product owner review (2026-07-07)

- **Source:** product owner's review notes (2026-07-07) + compliance research
  (`Docs/research/compliance-brief.md` — cited throughout as [brief §n]).
- **Status:** planned, not started. Work happens in future sessions, phase by
  phase. Each phase ends with its **follow-up questions** — answers needed
  before or during that phase, not before the roadmap is agreed.
- Bug reports from the review were root-caused and are folded into phases.

---

## Phase 0 — Legal & liability foundations

Mostly external (solicitor) work; product work is small but launch-blocking.

- Engage a solicitor with the priority list from [brief §Needs-solicitor]:
  1. **Employment Agencies Act 1973 / Conduct Regs 2003 fee restrictions vs
     our 15% carer-side commission.** This came out of research, not the
     notes, and it touches DR-0001 (the revenue model itself). Curam and
     PrimeCarers run carer-side fees lawfully somehow; we need to know how.
  2. Platform T&Cs for clients and for professionals, accepted at signup.
  3. Client↔professional **Service Agreement template** (platform provides
     it, is not a party): payment terms, payment handling, non-solicitation.
  4. Circumvention fee form + amount (Curam benchmark: £1,000+VAT, with a
     £750+VAT buy-out after 90 days on-platform [brief §6]).
  5. Guardrails so product features never create "ongoing direction or
     control" (CQC exemption) or employment-status exposure [brief §6].
- **Insurance decision** [brief §5]: require professionals to hold their own
  cover vs arrange a Curam-style group policy that only covers platform-booked
  visits (stronger anti-disintermediation, more setup). Either way: insurance
  evidence becomes a required vetting document for carers too (nurses already
  need own indemnity — NMC condition; we already collect `insurance` docs).
- Product work: T&Cs acceptance checkboxes on both signup flows (with version
  + timestamp recorded); contract-issuance step in the vetting pipeline
  (professional signs the working agreement after approval, before going
  live); document the signature mechanism decision.

**Follow-up questions (Phase 0):**
- Who's the solicitor / what budget? (This gates the phase.)
- Insurance: carers hold their own (~£89/yr, £5m PL norm) or platform group
  policy? The group policy is a real retention weapon but costs and admin.
- E-signature: is recorded checkbox acceptance enough for the professional
  working agreement, or do you want a signed-document flow (e.g. a signature
  drawn/typed on screen, PDF generated and stored)?
- Banking details: when Stripe goes live, payout details are collected by
  Stripe's own onboarding (we never store bank details — safer and less
  regulated). OK to keep it that way rather than a bank-details form?

## Phase 1 — Vetting & onboarding hardening ✅ SHIPPED 2026-07-08

The registration/document overhaul for both professions.

- **Copy fix:** "Join as a carer" becomes carer AND nurse everywhere on the
  marketing site (nav, buttons, /join headings).
- Registration changes: **phone mandatory** (both audiences); carers need
  **minimum 2 years' experience** (validated at application, shown as a
  requirement up front); **gender mandatory** for professionals.
- **Document requirements** (vetting checklist + compliance engine update):
  - Proof of address **×2** (distinct documents)
  - Passport (all professionals)
  - **Right to work, branched** [brief §4]: British/Irish passport = passport
    alone is sufficient (current or expired). Everyone else = **online share
    code check only** (share code + DOB; no visa/BRP copy — BRPs are dead,
    it's eVisas now). Store the share code + check result. Note: RTW duties
    extend to self-employed workers ~Oct 2026, so this is mandatory for all.
  - **Driving licence** upload (new doc type) + "can drive" profile flag.
  - **CV upload** (all professionals).
  - **Training certificates, multi-upload with completion dates.** Certificate
    types seeded from the sector-standard mandatory list [brief §1]: Care
    Certificate, moving & handling, safeguarding adults (+children), basic
    life support/first aid, fire safety, food hygiene, infection prevention,
    medication, MCA/DoLS, health & safety, information governance.
  - Nurses additionally [brief §2]: **NMC as two entries** (PIN/statement of
    entry + revalidation date — and we verify current status on the NMC
    register, since a statement of entry is NOT proof of registration),
    indemnity insurance evidence, and a **clinical skills checklist**
    (self-rated novice/competent/expert across the categories in [brief §3]:
    medication routes incl. syringe drivers, PEG/NG feeding, tracheostomy,
    catheter care, wounds, diabetes, palliative, vital signs/NEWS2...).
- Compliance engine: per-certificate expiry logic. **Decision needed** on the
  notes' "older than 1 year must be redone": annual-for-everything is NOT the
  legal position — the researched norm is BLS annually, first aid 3-yearly,
  most others 3-yearly [brief §1].
- Pipeline: documents approved → interview passed → **contract issued and
  accepted → profile goes live** (new contract state between vetting and
  active).

**Follow-up questions (Phase 1) — ANSWERED 2026-07-08:**
- Training refresh: **per-certificate periods** (BLS/medication/IG annually,
  most others 3-yearly, per Skills for Care norms).
- Insurance (from Phase 0, affects Phase 1 docs): **carers hold their own**
  PL + indemnity; evidence becomes a required carer vetting document.
- Contract signature: **recorded acceptance** (version + timestamp + IP).
- RTW re-check: **on status expiry + the 6-month compliance sweep**.
- Still open: any nurse minimum experience beyond active NMC registration.

## Phase 2 — Profiles & matching v2 ✅ SHIPPED 2026-07-08

- **Photos:** exactly 3 uploaded photos per professional (real uploads to
  storage, replacing the photo URL field). Needs a new public-read bucket +
  moderation stance (admin approves photos as part of vetting?).
- **Profile fields:** cooking skills (basic / good / very good); can-drive
  flag (from licence doc); languages become a **multi-select** from a fixed
  list (so matching is reliable, replacing free-text).
- **Category pruning (greyed out, not deleted):** carers lose *complex care*
  and *end-of-life* for now; nurses lose *mental health* and *learning
  disability*. Shown disabled ("not yet offered") in profile editors and
  search filters; existing DB values untouched.
- **Care-needs vocabulary updates** (client questionnaire): plain-English
  explanation for memory support; add *running affairs/errands*; add
  *accompanying to appointments and outings*; split *medication prompts* vs
  *medication support*; add **needs a driver** (matches to can-drive carers).
- **Postcode proximity matching:** collect postcode from professionals and
  clients, geocode (postcodes.io is free for UK), store coordinates, and rank
  matches by distance with a sensible radius. This is the biggest matching
  upgrade in the phase.
- **Live-in prerequisite:** when a client's needs include live-in care, the
  care profile asks them to confirm a spare room + bathroom access, and the
  booking flow reminds them.
- Client notes: already collected in the care profile; surface them to the
  carer at meet-and-greet/booking time (currently client_notes only travel on
  bookings).

**Follow-up questions (Phase 2) — ANSWERED 2026-07-08:**
- Photo moderation: **admin approval before display**.
- Proximity: **default 15 miles, client-adjustable 5-50, live-in exempt**.
- Languages: **the ~20-language UK list + an "Other" free entry**.

## Phase 3 — Scheduling & availability

- **Calendar blocking:** when a booking is confirmed, those dates/times are
  blocked on the professional's calendar and reflected in search/booking (no
  double-booking). This is the mechanism the notes asked about — it doesn't
  exist yet and needs a proper availability model (recurring weekly pattern +
  date exceptions + booking blocks).
- **Availability detail:** dates of availability; when "limited" is chosen,
  a structured follow-up (which days/times); add **visits** as an
  availability/work-pattern option for both sides.
- **Weekly availability email:** every week, professionals get an email
  stating their current availability with a link to confirm or change it
  (cron + email layer already exist; the link needs a signed token or simply
  requires login).
- **Bug, root-caused:** the dashboard "Confirm availability" button DOES work
  (verified: the timestamp updates in the database) — it just gives zero
  visual feedback, so it feels dead. Fix: success state + show "last
  confirmed" clearly. The weekly email complements rather than replaces it.

**Follow-up questions (Phase 3):**
- Does the weekly email need one-click confirm (signed link, no login) or is
  "click through and sign in" acceptable at this stage?
- Should clients see a professional's calendar (free/busy) before proposing
  a booking, or keep proposals date-first and let the carer decline?

## Phase 4 — Admin portal v2

- **Remove the credits remnants** (the admin clients page still shows credit
  balances and a grant-credits tool — legacy of the retired model).
- **Client visibility:** admins currently see only name/phone/joined. Add:
  email address (needs an admin lookup — emails live in the auth system, not
  the profiles table), the care profile (who care is for, needs, schedule,
  languages...), and **when they need care**, surfaced on the client list and
  on interview/booking oversight pages.
- A proper client detail page (mirroring the professional detail page).

**Follow-up questions (Phase 4):**
- Anything else the agency team needs at a glance per client (notes field for
  staff? contact log?) while we're in there?

## Phase 5 — Later: Google Workspace integration

- Calendar + Google Meet for interviews: internal staff, professional and
  client all invited from the admin scheduling flow; Meet link auto-attached
  (replaces the manual video-URL field). AI transcription and summaries of
  interviews within the Google platform.
- Prerequisite: a Google Workspace account on the business domain — so this
  naturally follows the domain purchase. Parked until then by design.

**Follow-up questions (Phase 5):**
- Which Workspace tier (Meet recording/transcripts need Business Standard+)?
- Should interview summaries be stored against the professional's record in
  the admin portal (useful, but it's personal data — retention policy)?

---

## Phase 6 — SEO & AI-search technical layer

Parked here by decision (2026-07-08). Full audit + plan: `Docs/seo-plan.md`.
Section A of that plan (robots/noindex control, per-page metadata + canonicals
+ OG, JSON-LD entity graph, sitemap, OG images, llms.txt, About/Contact/legal
pages) is buildable any time and survives the rename; Sections B-D unlock with
the domain and launch.

---

## Sequencing note

Phases 1 and 2 shipped 2026-07-08 (commits 351179f, bfa8564). Phase 0's
solicitor work remains with Dustin and is now the launch-critical item. Phase 2 makes
matching genuinely good. Phases 3-4 are operational quality. Phase 5 waits on
the domain; Phase 6 (SEO) is parked last but Section A can slot into any gap.
The standing pre-launch items (domain, brand name, Stripe, contact details)
run in parallel and none of this blocks them.
