---
name: HomeTouch
category: direct-marketplace
url: https://myhometouch.com/
researched: 2026-07-05
---

# HomeTouch (myhometouch.com) — Competitive Intelligence

> **Access note:** myhometouch.com was returning 504 Gateway Timeout from its own nginx on 2026-07-05 (research date). All site content below is from Wayback Machine captures dated Jan–May 2026, cross-checked with live search snippets. Snapshot URLs cited per section.

## TL;DR

HomeTouch is the cautionary tale for pure introduction marketplaces. Founded 2015 by NHS dementia doctor Jamie Wilson as an open hourly-care marketplace, it progressively retreated up-market: nationwide live-in care (2017, via buying a 25–30k carer database), then a **hybrid two-tier model** — an "Introductory" (introduction-agency) tier from ~£1,400/week and a CQC-"Regulated" managed tier from ~£1,500/week — positioned as nurse-led dementia specialists. It charges **20–30% commission (incl. VAT) baked into carer rates**, enforces a **£5,000 exit fee** against disintermediation, raised ~£5–7M over a decade without breaking out, and by 2025 was consolidating (absorbing Guardian Carers) rather than growing organically. ~25 staff, small-company accounts, CQC "Good" (2019).

---

## 1. Business model

**Who pays whom:** Families pay HomeTouch weekly (direct debit / recurring card; BACS carries a +5% admin fee); HomeTouch pays self-employed carers weekly by BACS. Carers are **self-employed under BOTH tiers** — even the CQC-regulated one ([pricing page](https://myhometouch.com/pricing), [carer FAQ](https://myhometouch.com/apply), snapshots Feb 2026).

**Two-tier hybrid — the core strategic artifact:**

| | Introductory (introduction agency) | Regulated (CQC-managed) |
|---|---|---|
| Price | From **£1,400/week** | From **£1,500/week** |
| CQC | Not regulated ("The CQC does not regulate introductory models of care, but we apply the same rigorous standards") | "Fully managed clinical service… regulated by the CQC" |
| Family gets | Carer shortlist, choice, messaging, contracts, care journal; family manages the care | All of that + nurse-led care plan, face-to-face assessment, supervision visits, emergency cover, end-of-life pathway, PPE |
| Eligibility | Anyone | Only ≥20 hrs/week hourly or ≥3 days/week live-in; **all carers must come from HomeTouch**; companionship-only care CANNOT be regulated |
| Switching | Families can move between tiers as needs change | — |

Source: [myhometouch.com/pricing](https://myhometouch.com/pricing) (Wayback 2026-02-11). The £100/week delta between tiers is strikingly small — HomeTouch effectively prices the introductory tier nearly as high as managed care, using the managed tier's clinical brand halo.

**Take rate:** "Hometouch fees range from **20% – 30% (incl. VAT) of stated carers rates**. This commission is already included in the rate stated on each carer's profile… and in any rate quoted by a Care Advisor." — [Introductory T&Cs](https://myhometouch.com/terms-caremarketplace) §3.5 (Wayback Feb 2026). Care Advisors may also quote "set packages" that "supersede the stated rates of a Carer" (§3.4) — i.e. on advisor-sold packages the effective margin can exceed the published carer rate math (inference: family pays from £1,400/wk while carers earn £700–£900/wk, implying ~35–45% effective gross margin on packaged live-in care — inferred, not stated).

**Anti-disintermediation:** cash payments to carers are banned; going direct "with the deliberate intention of avoiding Hometouch fees" is a terms breach; and both the introductory and managed T&Cs impose a **£5,000 exit fee** "if the client and carer decide to no longer work with Hometouch and engage privately" ([Introductory T&Cs §4.5](https://myhometouch.com/terms-caremarketplace), [Managed T&Cs §5.6](https://myhometouch.com/managed-care-terms)). Liability to introductory clients is capped at commission earned from that client (§6.4).

**Other revenue mechanics:** double charge on bank holidays (carers get double pay too); billing starts with 2 weeks upfront; night wakes >5/week trigger prorated extra charges; 24h cancellation cutoff (else session is charged/credited).

## 2. Pricing (families and carers)

**Families** ([pricing](https://myhometouch.com/pricing) + [cost-of-live-in-care](https://myhometouch.com/cost-of-live-in-care), Wayback Jan–Feb 2026):
- Introductory live-in: **from £1,400/week**. Regulated live-in: **from £1,500/week**.
- Published market guidance on their cost page: standard live-in £1,200–£1,500/wk; complex £1,600–£1,800; couples £1,600–£1,900; respite from ~£1,000–£1,300; two-carer/clinical cases £2,000+.
- Hourly care ~£25–£35/hr (their own figure); overnight ~£250 waking / £200 sleeping night; minimum visit 1 hour; no minimum contract length, 2 weeks' notice to end ongoing contracts (intro model), 7 days' cancellation notice for managed live-in visits.
- Pricing is **fully public** — dedicated `/pricing` and `/cost-of-live-in-care` pages with "from" prices, plus a `/find-carer-costs` postcode funnel. No hidden-quote gate, though "Book a call with a care advisor" CTAs are everywhere.

**Carers** ([apply page](https://myhometouch.com/apply), Wayback 2026-02-03):
- Headline: live-in carers earn **£100–£120/day**; FAQ states **£700–£840/week + £40/week food allowance**; sitewide footer banner advertises **"£750 – £900 per week. Double bank holiday pay."** Paid weekly by BACS.
- Carers nominally set their own rates (marketplace DNA in the T&Cs) but advisor packages override them in practice.
- No sign-up fee or subscription for carers found anywhere; training is free ("Hometouch pays for training"); £50 joining bonus for completing onboarding within 2 weeks; up to £50 first-day travel paid on regulated packages only.

## 3. Client acquisition

- **SEO is the primary visible engine.** Programmatic footprint: ~120 "Live-in Care in [county]" pages covering every UK county incl. Scotland/NI/Isle of Man ([locations sitemap](https://myhometouch.com/locations-sitemap)); ~14 care-type pages (live-in, 24-hour, overnight, respite, domiciliary…); ~14 condition pages (dementia, Parkinson's, MND, stroke, brain injury…); large advice blog (`/articles`) targeting cost and decision keywords — e.g. "Live-In Care Cost UK: From £1,200/Week (2026 Guide)", "How much is overnight care for the elderly", funding guides (Attendance Allowance, NHS CHC, direct payments). Homepage title tag: "Live-In Care UK | Nurse-Led, Dementia Specialists". Internal links carry `utm_source=google&utm_medium=organic` tagging, indicating they measure organic funnel entry points deliberately.
- **Healthcare partnerships / B2B referrals** are a named channel with a dedicated team (partners@myhometouch.com, separate phone line): **NHS Integrated Care Boards, hospital discharge teams, case managers, local authorities, charities**; homepage promises "Hospital discharge in 24–72 hours. We work with NHS ICBs, hospital discharge teams, and case management companies" ([partners page](https://myhometouch.com/partners), Wayback May 2026). Carer FAQ mentions working with "hundreds of families and CCG's nationwide". A downloadable "partners guide" is used for B2B lead capture.
- **Acquisition-led growth:** bought LiveInCareJobs.com's database of ~25–30k live-in carers in 2017 to go nationwide overnight ([TechCrunch, Mar 2017](https://techcrunch.com/2017/03/06/home-care-marketplace-hometouch-quietly-picks-up-backing-from-500-startups-launches-uk-wide/)); absorbed **Guardian Carers** (London introduction agency for carers/housekeepers) around end of June 2025 ([guardiancarers.co.uk announcement](https://guardiancarers.co.uk/care-news/guardian-carers-joins-hometouch-care)) — buying demand and supply rather than winning it organically.
- **PR/founder brand:** Dr Jamie Wilson's NHS-dementia-doctor story is the spine of all press (TechCrunch, Doctorpreneurs, Talk Business) and of on-site trust copy.
- **Directories:** listed on homecare.co.uk, TrustedCare, Wiserr, liveincare.org.uk, agespace.org "best live-in care companies". No evidence found of significant paid-ads spend (not conclusive — can't verify ad libraries from here; mark uncertain).
- No visible consumer referral scheme (none found on archived pages).

## 4. Carer supply side

- **Pitch:** "Live-in carer roles with clinical support and fair, transparent pay… £100–£120 per day… never work in isolation" — clinical backup as the differentiator vs other agencies, plus choice ("You choose your own clients", carers can express interest in jobs from alerts and speak to the client before both agree). Self-employment sold as flexibility; working for competing agencies simultaneously is explicitly allowed ([apply page](https://myhometouch.com/apply)).
- **Funnel/friction:** 20-minute online application → recruiter contact in 24–48h → 30–40 min video interview → conditional offer subject to right-to-work, **enhanced DBS**, references, clinical training. Target ~2-week onboarding; £50 bonus for completing in 2 weeks. Requirements: 6+ months care experience, UK right to work, fluent English; overseas applicants need overseas police clearance + DBS.
- **Vetting claims (marketing):** "46 point vetting process", face-to-face interviews of every carer, "less than 5% of applicants are accepted", ID/qualification/DBS checks, 2 references, scenario testing ([what-we-do](https://myhometouch.com/what-we-do), homepage FAQ). Carers hold **personal liability insurance** (their own policy — HomeTouch "will ensure" one is in place if the client requests it, i.e. insurance burden sits with the carer).
- **Training:** free 1-day Skills-for-Care-endorsed practical update + 7 e-learning courses + in-house Dementia Specialist Training run by the clinical team — a genuine retention/quality lever and brand-consistent.
- **Economics:** carer keeps £700–£900/week of a £1,400+ package; "Our carers are paid above the industry average" (homepage claim, plausible but unverified against market data).

## 5. Website / product teardown

- **Positioning:** wholesale shift from marketplace language to clinical authority: "Expert live-in care in the UK. Founded by an NHS doctor specialising in dementia. Nurse-led, CQC-regulated, caring for families across the UK since 2015" (homepage H1 area, Wayback 2026-05-29). Dementia specialism is the wedge; "one of the only UK live-in care agencies with a clinical founder."
- **Funnel:** dual-path — (a) self-serve: postcode search → **Carer Library** (filter by language, skills, interests, experience; profiles with bios, videos, client reviews) → message carer → contract in-platform; (b) assisted: "Book a call" / phone 0203 870 4220 / live chat → care advisor assessment → curated shortlist. Advisor path is clearly the pushed default for live-in.
- **Product features (real platform, not brochureware):** Care Hub dashboard (schedules, contracts, billing, invoices), care plan builder ("quick to complete in less than 10 minutes", nurse-completed on managed tier), **care journal** (per-visit carer log, remotely visible to family, clinically monitored for deterioration flags), secure carer messaging ("auditable record"), care scheduler driving billing ("only be charged for care sessions that have been accounted for in the care scheduler"), multi-carer contracts, dispute process using "visit logging, messaging, geoverification" analytics, review/ranking system feeding carer matching.
- **Trust signals:** CQC "regulated" badging + link, Trustpilot widgets, DBS/vetting claims, "Trusted by more than 1,000 families — we deliver 50,000 hours of care each month" (homepage claim, unverified), founder credentials, named Head of Clinical Governance quoted in content, carers "fluent in English", insurance FAQ.
- **Honest regulatory UX:** the pricing page explains at length what the introductory tier CANNOT do — "hometouch cannot be involved in the management of introductory care… cannot maintain a rota… cannot provide emergency cover… cannot be liable for any disagreement." Unusually explicit; reads like lessons learned from complaints/CQC scrutiny.

## 6. Regulatory stance

- **Both models under one roof, clearly delineated.** Entity is CQC-registered ([CQC provider 1-4251823015](https://www.cqc.org.uk/provider/1-4251823015), location "HomeTouch Care Ltd"), rated **Good** (published 19 Nov 2019; ~54 people on regulated personal care at inspection). Managed T&Cs also self-define as an **Employment Business under the Employment Agencies Act 1973** — covering the introduction/supply activity.
- Marketing leads with "CQC-regulated" even though the introductory tier isn't — the regulated tier's halo covers the whole brand ("Our managed service is fully regulated by the Care Quality Commission, with an introductory option for families who want more direct control"). The introductory tier disclaims management to stay outside CQC scope, exactly the line an introduction agency must hold.
- Companies House SIC code is, amusingly, **62012 "Business and domestic software development"** — a relic of its tech-startup origin ([Companies House 09410945](https://find-and-update.company-information.service.gov.uk/company/09410945)).

## 7. Traction & financials

- **Founded/incorporated 28 Jan 2015** (Companies House). NOTE: our internal brief said "started 2011" — that appears to be **wrong**; all primary sources say 2015, and the company itself says "since 2015."
- **Funding:** Passion Capital seed (Dec 2015); £700k round led by Rocket Internet's Global Founders Capital (Jul 2016, [TechCrunch](https://techcrunch.com/2016/07/20/rocket-internets-gfc-backs-home-care-marketplace-hometouch/)); 500 Startups (2017); later investors include Ananda Impact Ventures, Better Society Capital, Future Fund (UK govt, 2020 convertible), Pinto Ventures; homecare.co.uk profile mentions BUPA backing. Totals reported: **$7.13M (Crunchbase)** vs $4.8M (medicalstartups) vs ">£5m" (homecare.co.uk) — treat as ~£4–6M, sources disagree. April 2024: share allotment + **Ananda Impact Fund III registered as person-with-significant-control** (Companies House PSC02, 3 May 2024) — consistent with a 2024 internal round/recap where an impact fund took ≥25% (inference).
- **Scale claims:** ">1,000 families served", "50,000 hours of care/month", ">500,000 hours delivered since 2015" (all self-reported, homepage/pricing). ~54 regulated clients at 2019 CQC inspection. **~25 employees** (ZoomInfo/LinkedIn-derived; Companies House files unaudited **abridged small-company accounts** — no public revenue; the "£258.2k revenue" figure floating on data-scraper sites is not credible).
- **Trajectory signals:** pivot arc = open marketplace (2015) → nationwide live-in via database acquisition (2017) → CQC registration + managed tier (~2019) → dementia/clinical premium positioning → acquiring Guardian Carers (mid-2025). Trustpilot ~**4.5/5 across ~150 reviews** (modest volume for 10 years). homecare.co.uk review score currently **1.0/10** (single recent review — a Guardian Carers client alleging service collapse post-takeover; small-n but a live integration-pain signal). Site down (504) at research time. Never a breakout: a decade in, it's a small, niche, clinically-differentiated live-in specialist, not a scaled marketplace.

## 8. Strengths, weaknesses, lessons for CareMatch

**Strengths:** clinical founder story + dementia specialism = defensible trust wedge; genuinely functional platform (care journal, scheduler-driven billing, geoverified visit logging, auditable messaging) that most introduction agencies lack; public transparent pricing; two-tier model captures clients whose needs escalate; strong programmatic SEO + NHS/ICB discharge partnerships; carers paid above average with free training (supply retention).

**Weaknesses:** never achieved marketplace scale — hourly-care marketplace economics failed and it retreated to high-ticket live-in; £1,400/wk introductory price is barely below managed care, leaving the affordable self-serve segment unserved; £5k exit fee and heavy anti-circumvention terms signal chronic disintermediation pressure; complexity of running two regulatory models confuses positioning; growth by acquisition suggests weak organic engine; Guardian Carers integration generating public complaints; funding-starved (~£5M over 10 years) with an impact-fund recap in 2024; carer "sets own rate" is largely fiction once advisor packages override it.

**Lessons for CareMatch:**
1. **Pure introduction on hourly care didn't sustain HomeTouch — it survived by moving to live-in (high weekly ticket, ~£350–£600/wk gross per client at 25–40% effective margin).** If CareMatch stays hourly/self-serve, the take per client is small: model CAC against a realistic per-client margin before choosing the revenue model, and consider live-in as the margin anchor.
2. **Disintermediation is the existential leak.** HomeTouch's answer: payments locked in-platform, cash banned, £5k exit fee, geoverified visit logging, liability cap tied to commission. CareMatch needs its own answer designed in from day one — ideally by making the platform (scheduling→billing linkage, care journal, insurance, replacement-carer access) more valuable than the ~25% saving from going direct, not by punitive fees that generate resentment and reviews like HomeTouch's.
3. **The introduction-agency line must be drawn in writing and in product.** Copy their discipline: an explicit "what we cannot do" section (no rota management, no emergency cover, no care management) keeps you outside CQC scope; their care journal shows you can still ship clinical-feeling value (visibility, logging, flags) without doing regulated "management". Steal the pattern, get UK legal sign-off on where journal-monitoring tips into managed care.
4. **Trust is bought with specifics, not adjectives:** "46-point vetting", "<5% acceptance", enhanced DBS, face-to-face interviews, insurance, named clinicians, CQC linkage. CareMatch's equivalent proof points (DBS verification UX, insurance requirement, review system) should be quantified on the homepage. A condition-level specialism (HomeTouch chose dementia) converts better than generic "find a carer".
5. **Their SEO playbook is replicable and still the cheapest demand channel:** county × service-type programmatic pages + cost-transparency content ("how much does live-in care cost 2026") + funding guides (Attendance Allowance/CHC/direct payments) + UTM-tagged organic funnels. Also note the channel they lean on that a self-serve startup can win early: **hospital discharge / ICB / case-manager partnerships** value speed ("care in 24–72 hours") — a fast-matching self-serve platform has a real story there.

### Key source index
- Homepage (Wayback 2026-05-29): https://myhometouch.com/
- Pricing & two-tier model (Wayback 2026-02-11): https://myhometouch.com/pricing
- Cost guide (Wayback 2026-01-23): https://myhometouch.com/cost-of-live-in-care
- Carer recruitment (Wayback 2026-02-03): https://myhometouch.com/apply
- Introductory T&Cs (commission 20–30%, £5k exit fee): https://myhometouch.com/terms-caremarketplace
- Managed care T&Cs: https://myhometouch.com/managed-care-terms · Carer T&Cs: https://myhometouch.com/terms-carer
- Partners/B2B: https://myhometouch.com/partners · Product tour: https://myhometouch.com/what-we-do
- Companies House: https://find-and-update.company-information.service.gov.uk/company/09410945
- CQC: https://www.cqc.org.uk/provider/1-4251823015
- TechCrunch 2016: https://techcrunch.com/2016/07/20/rocket-internets-gfc-backs-home-care-marketplace-hometouch/ · 2017: https://techcrunch.com/2017/03/06/home-care-marketplace-hometouch-quietly-picks-up-backing-from-500-startups-launches-uk-wide/
- Guardian Carers acquisition: https://guardiancarers.co.uk/care-news/guardian-carers-joins-hometouch-care
- Trustpilot: https://uk.trustpilot.com/review/www.myhometouch.com · homecare.co.uk: https://www.homecare.co.uk/homecare/agency.cfm/id/65432226422
