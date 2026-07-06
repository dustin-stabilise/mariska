export const meta = {
  name: 'competitor-research',
  description: 'Swarm research of UK care marketplace competitors — per-competitor MD files plus a synthesis index',
  phases: [
    { title: 'Scout', detail: 'map the UK care marketplace competitor landscape' },
    { title: 'Research', detail: 'one deep-research agent per competitor' },
    { title: 'Synthesize', detail: 'cross-competitor comparison and index file' },
  ],
}

const OUT = args.outDir
const DATE = args.date

const CONTEXT = `Project context: "CareMatch" (working name) is a pre-launch UK care INTRODUCTION marketplace — a self-serve platform connecting families directly with self-employed carers for home care. Introduction-agency model (not a CQC-registered managed provider). Revenue model still being decided. We are researching competitors to inform business model, pricing, and client-acquisition decisions.`

// ---------- Phase 1: Scout ----------
phase('Scout')
log('Scouting the UK care marketplace landscape...')

const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    competitors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string', description: 'kebab-case filename slug' },
          url: { type: 'string' },
          category: { type: 'string', enum: ['direct-marketplace', 'managed-hybrid', 'directory-aggregator', 'defunct-lesson'] },
          whyRelevant: { type: 'string' },
        },
        required: ['name', 'slug', 'category', 'whyRelevant'],
      },
    },
  },
  required: ['competitors'],
}

const scout = await agent(
  `${CONTEXT}

Use ToolSearch to load WebSearch and WebFetch, then research the current (${DATE}) UK home-care competitor landscape. Identify the 12-14 companies MOST worth deep-researching, across four categories:
1. direct-marketplace: self-serve care introduction platforms connecting families with self-employed carers (e.g. Curam, PrimeCarers, TrustonTap — verify these are still operating and find any others, including newer entrants).
2. managed-hybrid: tech-enabled managed home-care providers competing for the same families (e.g. Elder, Cera, Helping Hands — pick the 2-3 most instructive).
3. directory-aggregator: care directories/lead-gen sites families use to find care (e.g. Lottie, Autumna, carehome.co.uk, Care.com UK presence — pick the 2-3 most instructive for acquisition-model lessons).
4. defunct-lesson: 1-2 failed/pivoted UK care marketplaces whose post-mortems are instructive (e.g. SuperCarers, CareSourcer).

Weight the list toward direct marketplaces (at least 5-6 of them) — they matter most. Verify each company still exists (or note it as defunct-lesson). Return the structured list; whyRelevant should say in one sentence what CareMatch can learn from them.`,
  { label: 'scout-landscape', schema: SCOUT_SCHEMA }
)

log(`Scout found ${scout.competitors.length} competitors: ${scout.competitors.map(c => c.name).join(', ')}`)

// ---------- Phase 2: Research (one agent per competitor, parallel) ----------
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    oneLiner: { type: 'string' },
    businessModel: { type: 'string' },
    pricingSummary: { type: 'string' },
    acquisitionChannels: { type: 'array', items: { type: 'string' } },
    keyTakeawayForCareMatch: { type: 'string' },
    filePath: { type: 'string' },
  },
  required: ['name', 'oneLiner', 'businessModel', 'pricingSummary', 'acquisitionChannels', 'keyTakeawayForCareMatch', 'filePath'],
}

const researched = await pipeline(
  scout.competitors,
  (c) => agent(
    `${CONTEXT}

You are a competitive-intelligence researcher. Deep-research ONE competitor: **${c.name}** (${c.url || 'find their site'}). Category: ${c.category}. Relevance: ${c.whyRelevant}

Use ToolSearch to load WebSearch and WebFetch. Research thoroughly — their own website (multiple pages: homepage, pricing, how-it-works, for-carers, FAQ, terms), plus third-party sources (Trustpilot/reviews, Companies House / funding news, press, job ads, blog/SEO footprint). Cover ALL of:

1. **Business model** — who pays whom, revenue streams, marketplace vs managed, take rate/commission if discoverable.
2. **Pricing** — exact prices/fees for families AND for carers (hourly rates, commission %, subscription fees, sign-up fees). Quote real numbers with source URLs. If pricing is hidden, say what the funnel does instead (quote forms, callbacks).
3. **Client acquisition** — how they get families: SEO (what keywords/content, roughly how big their organic footprint looks), paid ads, partnerships (councils, NHS, hospital discharge, charities), referral schemes, PR, marketplaces/directories they list on.
4. **Carer supply side** — how they recruit and vet carers, what carers earn/keep, carer-facing pitch, onboarding friction.
5. **Website/product teardown** — positioning and headline messaging, conversion funnel (what a family clicks through to a match), trust signals (DBS, insurance, reviews, guarantees), notable product features (matching algorithm, messaging, payments, care plans).
6. **Regulatory stance** — CQC-registered provider vs introduction agency; how they present this.
7. **Traction & financials** — founding year, funding raised, headcount signals, revenue if public, growth or decline signals.
8. **Strengths, weaknesses, and 3-5 specific lessons for CareMatch.**

${c.category === 'defunct-lesson' ? 'This company failed or pivoted — focus on WHY (post-mortems, founder interviews, press) and the lessons.' : ''}

Cite source URLs inline throughout. Mark anything uncertain or inferred as such — never present a guess as fact.

Then WRITE your full report (aim for 150-300 lines of dense, well-structured markdown) to the file: ${OUT}/${c.slug}.md
Start the file with YAML frontmatter:
---
name: ${c.name}
category: ${c.category}
url: <their url>
researched: ${DATE}
---

Finally, return the structured summary (filePath = the path you wrote).`,
    { label: `research:${c.slug}`, phase: 'Research', schema: SUMMARY_SCHEMA }
  )
)

const done = researched.filter(Boolean)
const failed = scout.competitors.filter((c, i) => !researched[i]).map(c => c.name)
if (failed.length) log(`WARNING — research agents failed for: ${failed.join(', ')}`)
log(`${done.length}/${scout.competitors.length} competitor reports written.`)

// ---------- Phase 3: Synthesize ----------
phase('Synthesize')

const synthesis = await agent(
  `${CONTEXT}

All per-competitor research reports are in ${OUT}/ — read EVERY .md file in that directory (use Glob then Read). Here are the researchers' own summaries as orientation:
${JSON.stringify(done, null, 2)}

Write a synthesis file to ${OUT}/00-overview.md — this is the primary file a future Claude Code session (or the founder) will load first, so make it dense and decision-oriented. It must contain:

1. YAML frontmatter (researched: ${DATE}, competitor count).
2. **How to use this research** — 2 lines pointing to the per-competitor files (relative links).
3. **Landscape map** — the categories and who sits where.
4. **Comparison table** — one row per competitor: category, revenue model, family-side pricing, carer-side economics/commission, CQC stance, traction signal.
5. **Pricing landscape** — what the market charges, clustering, where the gaps are.
6. **Client-acquisition playbooks** — the channels that recur across winners (SEO/content patterns, council/NHS partnerships, directories), with specifics.
7. **Supply-side patterns** — vetting norms, carer economics, what attracts carers.
8. **Failure lessons** — why the defunct ones died.
9. **Strategic implications for CareMatch** — 8-12 numbered, specific, actionable insights derived from the evidence (not generic advice). Where competitors disagree on model choices, state the tradeoff.
10. **Index** — linked list of every per-competitor file with its one-liner.

Base every claim on the report files; do not invent facts. Return a short (10-15 line) plain-text executive brief of the most important findings.`,
  { label: 'synthesize-overview' }
)

return {
  outDir: OUT,
  reportsWritten: done.map(d => d.filePath),
  failed,
  executiveBrief: synthesis,
}