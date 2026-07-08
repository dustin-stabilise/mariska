# SEO & AI-search plan — audit + what's needed

- **Audited:** 2026-07-07 (code + live deployment), against the SEO/AEO playbook.
- **Big picture:** the site's *content* is already unusually SEO-healthy (honest
  attributed claims, one H1 per page, real FAQs, descriptive alt text, next/font,
  static pages). The *technical and entity layer* barely exists yet — and most
  off-page work is **gated on the domain and brand name**, so this plan splits
  into "build now, env-gated" vs "unlocked by domain/name" vs "unlocked by launch".

## Audit findings (current state)

| Check | State |
|---|---|
| Titles | Root template + per-page on 2 of 3 marketing pages; home page uses the default only |
| Meta descriptions | One site-wide description reused everywhere |
| H1 discipline | ✓ one per page |
| Open Graph / Twitter tags | **None at all** (shares render bare) |
| Canonical URLs | None |
| robots.txt / sitemap.xml | **404 / 404** |
| JSON-LD structured data | **Zero** on the whole site |
| OG images | None |
| llms.txt | None |
| Indexability | mariska-gray.vercel.app is **indexable right now** (no noindex header) — a pre-launch site with placeholder contact details can enter Google's index on a domain we'll abandon |
| About / contact / legal pages | **Don't exist** — footer Privacy/Terms/Safeguarding links point at "/" |
| Content depth | 3 marketing pages; no guides/cost content (the sector's highest-intent cluster) |
| Performance | Expected good (static, SVG illustrations, next/font); measure at launch |

## A — Build now (works regardless of final name; driven by brand config + env)

1. **Indexing control first:** `robots.ts` + a site-wide `noindex` while the app
   runs on the vercel.app host; both flip automatically when `NEXT_PUBLIC_APP_URL`
   is the real domain. Prevents indexing the throwaway host, zero cost later.
2. **Metadata pass:** unique title + meta description per public page (home page
   included), `metadataBase` + self-referencing canonicals, OG/Twitter tags on
   every route — all reading from `src/lib/brand.ts` so the rename flows through.
3. **JSON-LD entity graph** (playbook Phase 2), brand-config-driven:
   - `Organization` with stable `@id` in the root layout (name/legalName/logo/
     contactPoint from brand config; `sameAs` empty until profiles exist).
   - `WebSite` referencing the org (no SearchAction — we have no `?q=` search).
   - `FAQPage` on the home page + how-it-works (the FAQs already exist and are
     exactly the citable Q&A shape AI engines extract).
   - `Service` on how-it-works/for-carers, `BreadcrumbList` on sub-pages.
   - Validate in Rich Results Test before shipping.
4. **sitemap.ts** with real per-page lastmod (content dates, not build time).
5. **Per-route OG images** via Next `ImageResponse`: brand colours + Spectral
   headline per page (name comes from config, so safe to build now).
6. **llms.txt**: what the platform is, how pricing works (the true 85%/6% numbers),
   the vetting stack, key pages. Our no-invented-claims copy is already ideal
   LLM-citation material.
7. **Missing pages that are also SEO surface:** About (E-E-A-T: who's behind it,
   why it exists), Contact, and real Privacy/Terms/Safeguarding pages (these are
   trust signals for Google AND humans; Terms content arrives via Roadmap Phase 0's
   solicitor work — the routes and placeholders can exist sooner).
8. **AI crawler policy** in robots.ts: explicitly allow GPTBot, OAI-SearchBot,
   PerplexityBot, ClaudeBot, Google-Extended once we're on the real domain (we
   want AI answers citing us; blocked = invisible).

## B — Unlocked by the domain + name (do immediately after)

1. Point `metadataBase`/canonicals at the real domain; flip robots to index;
   **301 the vercel.app host** to it; verify the redirect is 301/308 not 307.
2. **Google Search Console + Bing** verification; submit sitemap; single
   analytics path (one tag, not GA4+GTM double-loading).
3. **Wikidata entity** for the company (highest-ROI single lever for LLM citation;
   no notability gate) + add the QID to Organization `sameAs`.
4. Social profiles (even placeholders) + Trustpilot/Google review profiles →
   `sameAs` + footer `rel="me"` links.
5. Email deliverability records (SPF/DKIM/DMARC via Resend) — not SEO, but same
   domain-day checklist.

## C — Unlocked by launch (region + real supply)

1. **Local SEO pillar** (playbook 4b): Google Business Profile for the agency,
   NAP consistency, care-directory citations (homecare.co.uk eligibility for
   introducers needs verifying — flagged in competitor research too).
2. **Cost/funding content cluster** — the sector's highest-intent keywords
   ("cost of live-in care 2026", Attendance Allowance, NHS Continuing Healthcare,
   direct payments). Competitor research shows this is where Elder mints demand
   and managed incumbents structurally can't publish honest numbers. 4-6 deep,
   sourced guides beat a thin blog.
3. **Town × service pages ONLY behind real carer density** (the SuperCarers
   lesson: national SEO with London-only supply generates leads you can't serve).
   Quality bar per playbook Phase 5: unique detail, local FAQs, live carer counts.
4. **Review velocity** on third-party platforms once real matches exist (never
   self-published ratings schema — penalised).
5. Baseline + iterate: Search Console queries, Core Web Vitals field data,
   quarterly re-audit.

## D — Later / frontier

- MCP server + `/.well-known/mcp.json` so AI agents can query services and start
  an enquiry (pairs naturally with the booking platform; almost no competitor
  will have this).
- `llms-full.txt`, markdown export routes.

## Suggested sequencing vs Roadmap v2

Section A is a self-contained build (roughly a session) that can slot in any
time — it has no dependency on Roadmap v2 phases and nothing in it is wasted by
the rename. Section B is part of "domain day" alongside Resend/OTP. Sections C-D
belong to launch planning. Recommendation: do A soon so the technical layer ages
on the real domain from day one of B.

**Follow-up questions:**
- About page: how much of the founding story are you and the mrs happy to tell?
  (E-E-A-T wants named humans; even first names + a photo helps.)
- Should the vercel.app host stay noindexed forever (as a permanent staging
  convention) even after the domain 301s? (Recommended: yes.)
- Content cluster: written by us with cited sources, reviewed by you two for
  tone, published under a named author?
