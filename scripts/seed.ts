/**
 * Seed script — creates demo users and data against the local Supabase stack.
 * Run: pnpm seed   (requires supabase start + .env.local)
 *
 * Creates: 1 admin, 1 client (with credits), 6 professionals (4 carers,
 * 2 nurses) with approved compliance documents so they appear in search.
 * All passwords: password123
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// minimal .env.local loader (no dotenv dependency)
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
if (!url || !secret) throw new Error("Missing Supabase env vars");

const db = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "password123";

async function createUser(
  email: string,
  role: "client" | "professional" | "admin",
  first: string,
  last: string
) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { first_name: first, last_name: last },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  console.log(`✓ ${role.padEnd(12)} ${email}`);
  return data.user.id;
}

type Pro = {
  email: string;
  first: string;
  last: string;
  kind: "carer" | "nurse";
  headline: string;
  location: string;
  region: string;
  years: number;
  categories: string[];
  options: string[];
  languages: string[];
  interests: string[];
  tier: string;
  rateMin: number;
  rateMax: number;
  gender: "female" | "male";
  personality: string;
  comfortable: string[];
};

const PROS: Pro[] = [
  {
    email: "grace.carer@example.com", first: "Grace", last: "Okafor", kind: "carer",
    headline: "Live-in carer with a love of gardening and old musicals",
    location: "Manchester", region: "North West", years: 8,
    categories: ["live_in", "dementia", "companionship"],
    options: ["live_in", "long_term", "weekends"],
    languages: ["English", "Igbo"], interests: ["gardening","music","cooking"],
    gender: "female", personality: "warm_chatty", comfortable: ["pets"],
    tier: "gold", rateMin: 1600, rateMax: 2200,
  },
  {
    email: "tom.carer@example.com", first: "Tom", last: "Hughes", kind: "carer",
    headline: "Night care specialist, calm and dependable",
    location: "Leeds", region: "Yorkshire", years: 5,
    categories: ["night", "respite", "complex"],
    options: ["night_shifts", "part_time", "temporary"],
    languages: ["English"], interests: ["football","history","current_affairs"],
    gender: "male", personality: "calm_quiet", comfortable: [],
    tier: "silver", rateMin: 1500, rateMax: 1900,
  },
  {
    email: "maria.carer@example.com", first: "Maria", last: "Santos", kind: "carer",
    headline: "End-of-life and dementia care with warmth and dignity",
    location: "Bristol", region: "South West", years: 12,
    categories: ["end_of_life", "dementia", "day"],
    options: ["full_time", "day_shifts", "long_term"],
    languages: ["English", "Portuguese"], interests: ["cooking","music","faith"],
    gender: "female", personality: "warm_chatty", comfortable: ["pets"],
    tier: "platinum", rateMin: 1800, rateMax: 2500,
  },
  {
    email: "james.carer@example.com", first: "James", last: "Whitfield", kind: "carer",
    headline: "Companionship and respite care, new to the platform",
    location: "Norwich", region: "East of England", years: 3,
    categories: ["companionship", "respite", "day"],
    options: ["part_time", "day_shifts", "weekends"],
    languages: ["English"], interests: ["cards_games","books","walking"],
    gender: "male", personality: "calm_quiet", comfortable: ["pets"],
    tier: "bronze", rateMin: 1400, rateMax: 1700,
  },
  {
    email: "amara.nurse@example.com", first: "Amara", last: "Diallo", kind: "nurse",
    headline: "Registered nurse — complex and palliative care at home",
    location: "Birmingham", region: "West Midlands", years: 10,
    categories: ["palliative_nurse", "complex_nurse", "general_nurse"],
    options: ["full_time", "day_shifts", "long_term"],
    languages: ["English", "French"], interests: ["music","walking"],
    gender: "female", personality: "adaptable", comfortable: [],
    tier: "platinum", rateMin: 2800, rateMax: 3800,
  },
  {
    email: "sofia.nurse@example.com", first: "Sofia", last: "Novak", kind: "nurse",
    headline: "Community nurse specialising in dementia and mental health",
    location: "London", region: "London", years: 7,
    categories: ["community_nurse", "dementia_nurse", "mental_health_nurse"],
    options: ["part_time", "day_shifts", "weekends"],
    languages: ["English", "Czech"], interests: ["books","animals","walking"],
    gender: "female", personality: "warm_chatty", comfortable: ["pets"],
    tier: "gold", rateMin: 2600, rateMax: 3400,
  },
];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
const inMonths = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
};

async function main() {
  const adminId = await createUser("admin@example.com", "admin", "Agency", "Admin");
  const clientId = await createUser("client@example.com", "client", "Sarah", "Mitchell");

  for (const p of PROS) {
    const id = await createUser(p.email, "professional", p.first, p.last);

    const { error: proErr } = await db.from("professional_profiles").insert({
      id,
      kind: p.kind,
      status: "active",
      headline: p.headline,
      bio: `${p.first} has ${p.years} years of experience. ${p.headline}.`,
      location: p.location,
      region: p.region,
      years_experience: p.years,
      care_categories: p.categories,
      availability_status: "available",
      availability_options: p.options,
      languages: p.languages,
      interests: p.interests,
      hourly_rate_min: p.rateMin,
      hourly_rate_max: p.rateMax,
      tier: p.tier,
      interview_passed_at: new Date().toISOString(),
      nmc_pin: p.kind === "nurse" ? "12A3456B" : null,
      gender: p.gender,
      personality_style: p.personality,
      comfortable_with: p.comfortable,
      can_drive: true,
      rtw_route: "british_irish_passport",
      contract_version: "2026-07-draft-1",
      contract_accepted_at: new Date().toISOString(),
      ...(p.kind === "nurse"
        ? {
            nmc_verified_at: new Date().toISOString(),
            clinical_skills: {
              oral_topical_meds: "expert", injections: "expert", iv_therapy: "competent",
              controlled_drugs: "competent", syringe_drivers: "competent",
              peg_ng_feeding: "competent", catheterisation: "expert", bowel_stoma: "competent",
              wound_care: "expert", pressure_care: "expert", diabetes: "competent",
              palliative: "expert", vital_signs: "expert",
            },
          }
        : {}),
    });
    if (proErr) throw new Error(`profile ${p.email}: ${proErr.message}`);

    // approved documents -> compliance trigger recomputes to green
    const MANDATORY_CERTS = [
      "care_certificate","moving_handling","safeguarding_adults","basic_life_support",
      "fire_safety","food_hygiene","infection_prevention","medication","mca_dols",
      "health_safety","information_governance",
    ];
    const ANNUAL = new Set(["moving_handling","basic_life_support","medication","information_governance"]);
    const docs: { doc_type: string; certificate_type?: string; title: string; expiry: Date | null }[] = [
      { doc_type: "dbs", title: "Enhanced DBS certificate", expiry: inMonths(10) },
      { doc_type: "photo_id", title: "Passport (British)", expiry: inMonths(60) },
      { doc_type: "proof_of_address", title: "Council tax bill", expiry: null },
      { doc_type: "proof_of_address", title: "Utility bill", expiry: null },
      { doc_type: "reference", title: "Reference - previous client", expiry: null },
      { doc_type: "reference", title: "Reference - care agency", expiry: null },
      { doc_type: "cv", title: "CV", expiry: null },
      { doc_type: "insurance", title: p.kind === "nurse" ? "Professional indemnity insurance" : "Public liability & indemnity insurance", expiry: inMonths(6) },
      { doc_type: "driving_licence", title: "Driving licence", expiry: inMonths(48) },
      ...MANDATORY_CERTS.map((cert) => ({
        doc_type: "training_certificate",
        certificate_type: cert,
        title: cert.replace(/_/g, " "),
        expiry: cert === "care_certificate" ? null : inMonths(ANNUAL.has(cert) ? 9 : 30),
      })),
      ...(p.kind === "nurse"
        ? [
            { doc_type: "nmc_registration", title: "NMC registration (revalidation date)", expiry: inMonths(11) },
            { doc_type: "statement_of_entry", title: "NMC statement of entry", expiry: null },
          ]
        : []),
    ];
    for (const d of docs) {
      const { error } = await db.from("compliance_documents").insert({
        professional_id: id,
        doc_type: d.doc_type,
        certificate_type: d.certificate_type ?? null,
        title: d.title,
        storage_path: `${id}/${d.doc_type}/seed-placeholder.pdf`,
        issue_date: iso(new Date()),
        expiry_date: d.expiry ? iso(d.expiry) : null,
        status: "approved",
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      });
      if (error) throw new Error(`doc ${p.email}/${d.doc_type}: ${error.message}`);
    }
  }

  // give the demo client a purchased credit pack (test bypass payment)
  const { data: payment, error: payErr } = await db
    .from("payments")
    .insert({
      user_id: clientId,
      kind: "credit_pack",
      amount: 2500,
      status: "paid",
      provider: "test_bypass",
      paid_at: new Date().toISOString(),
      metadata: { seed: true },
    })
    .select()
    .single();
  if (payErr) throw new Error(payErr.message);

  const { error: creditErr } = await db.from("credit_ledger").insert({
    client_id: clientId,
    delta: 5,
    reason: "purchase",
    payment_id: payment.id,
    note: "Seed credit pack",
  });
  if (creditErr) throw new Error(creditErr.message);

  const { data: cards } = await db.from("professional_cards").select("first_name, kind, tier, location");
  console.log(`\n✓ Searchable professionals: ${cards?.length ?? 0}`);
  for (const c of cards ?? []) console.log(`  - ${c.first_name} (${c.kind}, ${c.tier}) — ${c.location}`);
  console.log("\nLogins (password: password123):");
  console.log("  admin@example.com / client@example.com / grace.carer@example.com …");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
