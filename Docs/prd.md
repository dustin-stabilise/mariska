# Product Requirements Document — Kindred (working name)

- **Status:** Living document. Update whenever the platform changes.
- **Last updated:** 2026-07-07
- **Owners:** Dustin (build), [wife — product owner]
- **Key decisions:** DR-0001 (revenue model) in `Docs/decisions/`
- **Evidence base:** 14-competitor UK market research in `Docs/research/competitors/`

## 1. What this is

A UK marketplace that introduces families to vetted, self-employed carers and
nurses, and keeps the whole relationship on the platform: finding, meeting,
booking, paying and staying compliant. It operates as an introduction agency
(not an employer, not a care provider), which places it outside the Care
Quality Commission's remit; carers are vetted to CQC-equivalent standards and
the site says so plainly.

The final brand name is undecided. "Kindred" is the working name and the whole
identity (name, contacts, colours) lives in one config file so renaming is a
single change.

## 2. Who it serves

- **Families/clients** arranging care for someone they love: they want a
  trustworthy person, fast, at an honest price, without a call-centre.
- **Carers and nurses** who want self-employment without its loneliness:
  set their own rate, choose their clients, keep most of what families pay.
- **The agency team** (staff/admin): vet applicants, review documents,
  coordinate meet-and-greets, oversee bookings, watch safeguarding.

## 3. How it makes money (DR-0001)

Dual-sided commission on bookings that run through the platform:

- The carer sets an hourly rate and **keeps 85%** of it (15% platform fee).
- The client pays the carer's rate **plus 6%**.
- Example at £20/hour: client pays £21.20, carer receives £17.00, platform
  earns £4.20 per hour (~21% blended take).

Why this model: every surviving UK competitor (Curam ~24% blended,
TrustonTap ~23%, PrimeCarers 12.5–20%) intermediates payments and takes
commission; both documented failures (SuperCarers, Care Sourcer) never owned
the ongoing transaction. Commission recurs for the life of a care
relationship; the earlier one-off introduction-fee model capped revenue at
£350–650 per client and was retired before launch.

Secondary revenue mechanics that remain:
- **Referral programme:** carers/nurses earn £25 (standard carer), £50
  (specialist carer) or £75 (nurse) for referring professionals who pass
  vetting.
- **Manual placement fees** (£350 carer / £650 nurse) exist as an admin tool
  for off-platform introductions if ever needed; not part of the core flow.

What is deliberately free: browsing full profiles, meet-and-greets, joining
as a professional, and there are no subscriptions. "No joining fees, no
unlock fees" is a marketing commitment.

## 4. The client journey

1. **Create a free account** (name, email; no card).
2. **Search** vetted professionals: filter by carer/nurse, care category
   (live-in, dementia, end-of-life, complex, respite, companionship, plus
   nurse specialisms), location, availability. Full profiles are free to
   view: bio, experience, rates, interests, languages, verification status,
   compliance standing, intro video (when provided).
3. **Free meet & greet:** request one from a profile; the team coordinates a
   time and can attach a video-call link. No contact details are exchanged;
   everything is arranged through the platform.
4. **Book care hours:** propose date/time on the carer's profile. The full
   price (rate + 6%) is shown before anything is committed. The carer accepts,
   the client pays through the platform, the visit happens, the client marks
   it complete, the carer is paid out.
5. **Ongoing care:** repeat bookings with the same carer; the client
   dashboard shows upcoming visits, proposals awaiting response,
   meet-and-greets and total spend.

## 5. The professional journey (carer / nurse)

1. **Apply** at /join: name, carer-or-nurse, gender, location, years of
   experience (carers need at least 2), mandatory phone, and recorded
   acceptance of the professional terms (version + timestamp + IP).
2. **Upload compliance documents** to a private vault: enhanced DBS,
   passport, two proofs of address, two references, CV, own public liability
   & indemnity insurance, and every mandatory training certificate
   individually (Care Certificate, moving & handling, safeguarding, basic
   life support, fire safety, food hygiene, infection prevention, medication,
   MCA/DoLS, health & safety, information governance) with completion dates;
   validity is per certificate (BLS/medication/moving-handling/IG annual,
   most others 3-yearly). Right to work is route-based: British/Irish
   passport suffices alone; everyone else provides a Home Office share code
   which the team verifies online (re-checked on expiry + the 6-month sweep).
   Optional: driving licence (feeds the can-drive matching flag).
   Nurses additionally: NMC PIN + statement of entry with revalidation date
   (the team verifies live register status), and a 17-item clinical skills
   self-assessment (at least 10 rated).
3. **Vetting:** the team reviews each document (approve/reject with notes)
   and conducts an interview. After approval the platform issues the
   **working agreement**; the professional's recorded acceptance (version,
   timestamp, IP) is required before the profile can go live. (Sector
   benchmark: leading platforms accept as few as 1 in 7.)
4. **Build the profile:** headline, bio, care categories, availability
   pattern, hourly rate (in pounds; they keep 85%), languages, interests,
   photo/video.
5. **Work:** respond to meet-and-greet requests and booking proposals
   ("you'll receive £X" is shown per booking), confirm availability weekly,
   watch earnings accrue (paid out per completed visit).
6. **Referrals:** invite other professionals; rewards paid after the referred
   person passes vetting.

## 6. The agency/staff view

Single admin dashboard covering:
- **Applications & vetting:** every professional with status
  (applied → in review → active / suspended / rejected), per-document review
  queue with in-browser viewing, interview sign-off, tier awards
  (Bronze → Platinum).
- **Compliance traffic lights:** every professional is scored automatically
  (green/amber/red) from their documents' validity and expiry horizon.
  Red or stale profiles drop out of client search automatically. Expiring
  documents are listed 60 days out.
- **Meet-and-greet coordination:** schedule accepted requests, attach video
  links.
- **Bookings oversight:** all bookings with money split (total, platform
  fees, carer net), payment and payout status; platform revenue summary.
- **Clients:** account list; credit grants remain as a legacy support tool.
- **Safeguarding:** flag queue (complaints, missed interviews, concerns) with
  resolve/dismiss workflow.

Staff accounts cannot be self-registered; they are provisioned deliberately
(an "invite staff" admin feature is a candidate addition).

## 7. Trust & safety engine (automated compliance)

- Private document vault per professional with issue/expiry dates.
- Automatic compliance scoring on every document change (engine v2,
  2026-07-08): DBS 15, right-to-work 10 (route-based), passport 5, proof of
  address ×2 5, references ×2 10, CV 5, insurance 10 (required for carers
  too), the full mandatory training set 20 (each certificate tracked with its
  own validity period), interview 10, availability freshness 10; nurses add
  NMC (docs + live-register verification) 5 and the clinical skills checklist
  5. Carer max 100, nurse max 110. Any required item missing/expired → red;
  anything expiring within 60 days → amber.
- **Red = invisible:** non-compliant profiles are excluded from search
  automatically, no human action needed.
- Daily automated job: expiry reminders at 60/30/7 days and on expiry
  (deduplicated, logged), weekly availability nudges, re-scoring around the
  expiry horizon.
- Availability honesty: profiles unconfirmed for 30 days drop out of search.

## 7a. Matching ("matched on what matters")

A light, skippable questionnaire powers personalised matching:

- **Clients** complete a "tell us about your loved one" care profile right
  after signup (skippable; nudged from dashboard and search until done): who
  the care is for, support needs (needs-based wording, never diagnoses),
  schedule, languages at home, interests (shared chip vocabulary), personality
  preference, carer gender preference, pets/smoking. A note explains why we
  ask; nothing is shown publicly.
- **Carers** pick from the same interest chips and add personality style,
  optional gender, and home-compatibility (pets/smoking) in their profile
  editor.
- **Matching is transparent, not a black box:** a weighted overlap of shared
  language (strongest), care-need fit, schedule, gender preference,
  personality and interests. Results are sorted by fit and shown as a badge
  plus reasons ("Great match · You both enjoy gardening · Speaks Polish"),
  never a percentage. An explicit gender-preference mismatch removes the card
  from that client's results; carers who leave gender blank are never
  filtered. Full profiles show a "what you share" panel.
- Vocabularies live in code (one file) so adding chips is trivial; decisions
  on data sensitivity: needs-based wording, faith only as an optional
  interest chip, everything optional and editable.
- **Phase 2 additions (2026-07-08):** postcode-based proximity (postcodes.io
  geocoding at save time; default radius 15 miles, client-adjustable 5-50;
  live-in searches exempt; carers beyond the radius are excluded, closer ones
  score higher with "About X miles away" reasons). New matchable facts:
  can-drive (pairs with the "a carer who drives" need), cooking skill (pairs
  with meals), 20-language multi-select. Care-needs vocabulary expanded
  (running affairs & errands, accompanying to appointments & outings,
  medication prompts vs medication support, plain-English memory support).
  Complex care and end-of-life (carers) and mental-health/learning-disability
  nursing are greyed out as "not offered yet" on both sides. Live-in requests
  require the client to confirm a spare room and bathroom access. Each
  professional has up to three photos, admin-approved before clients see
  them. Professionals see an "About the person" care summary for clients
  they're actually engaged with (interview or booking), never before.

## 8. Billing & money movement (current state)

- Booking lifecycle: proposed → accepted → paid → completed → carer payout.
  Amounts are snapshotted on each booking so later price changes never
  affect existing bookings.
- **Payments run in simulated "test mode"** until the Stripe account exists:
  every flow works end-to-end, transactions are flagged as test, and a
  safety gate prevents test mode from silently activating in production.
- When Stripe goes live: clients pay by card at booking, the platform fee is
  held back automatically, and the carer's share lands in their own
  Stripe-powered account (they onboard once from their dashboard); payouts
  follow completed visits. Go-live is configuration, not rebuilding.

## 9. Communications

Email notifications exist for: welcome (both audiences), meet-and-greet
requested/accepted/scheduled, booking proposed/accepted/paid, compliance
expiry reminders and availability nudges. They currently run in "log mode"
(recorded, not sent) until a sending domain + Resend account are configured.

Sign-in today is email + password. A passwordless version (emailed 6-digit
codes) is fully built and parked on a branch, blocked only on the domain/
email setup: deploying it before then would break sign-in.

## 10. What exists today (live) vs what's next

**Live in production:** marketing site (3 pages, illustrated, honest
attributed claims), client search/booking/meet-and-greet flows, professional
application/vault/earnings flows, admin vetting/compliance/bookings/
safeguarding, automated compliance engine + daily job, simulated payments,
one provisioned admin account.

**Next (in rough order):** (superseded in detail by Docs/roadmap-v2.md, the phased plan from the 2026-07-07 product-owner review; the launch basics below still stand)
1. **Domain** → unlocks real email sending + passwordless sign-in (built,
   parked) + professional email address.
2. **Brand name decision** → one-file swap; check trademark ("CareMatch" has
   known prior use by SuperCarers/Vitality; "Kindred" needs its own check).
3. **Stripe account** → real payments + carer payouts (config only).
4. **Real contact details** (phone/email) on the site.
5. **Founding cohort:** recruit first carers in ONE region (research lesson:
   density beats national spread), gather real testimonials to replace the
   illustrative ones.
6. ~~Invite-staff feature~~ — shipped 2026-07-07 (admin dashboard → Staff).
7. Post-launch candidates: reviews/ratings, backup-carer pools, care notes,
   council/Direct Payments channel, org accounts (see research
   recommendations #8/#12).

## 11. Business rules quick reference

| Rule | Value |
|---|---|
| Client fee on bookings | +6% on carer rate |
| Carer platform fee | 15% (keeps 85%) |
| Meet & greets | Free |
| Joining / browsing / subscriptions | Free / free / none |
| Referral rewards | £25 / £50 / £75 (carer / specialist / nurse) |
| Compliance reminder points | 60 / 30 / 7 days before expiry |
| Availability staleness limits | Amber nudges from 7 days; hidden at 30 |
| Nurse extras | NMC registration + indemnity insurance |
| Manual placement fee (admin tool) | £350 carer / £650 nurse |
