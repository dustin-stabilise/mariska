/**
 * End-to-end verification against the local stack:
 * RLS boundaries, credit/unlock flow, RPCs, and authenticated page renders
 * through the real Next.js server (cookie-based session).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync("/Users/dusty/Documents/GitHub/mariska/.env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const APP = "http://localhost:3000";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

function client() {
  return createClient(URL_, PUB, { auth: { persistSession: false } });
}

async function login(email) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password: "password123" });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { c, session: data.session };
}

// @supabase/ssr cookie format: sb-<ref>-auth-token = "base64-" + base64url(JSON(session)), chunked at ~3180
function sessionCookies(session) {
  const ref = new URL(URL_).hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const MAX = 3180;
  if (value.length <= MAX) return [`${name}=${value}`];
  const chunks = [];
  for (let i = 0; i * MAX < value.length; i++) {
    chunks.push(`${name}.${i}=${value.slice(i * MAX, (i + 1) * MAX)}`);
  }
  return chunks;
}

async function getPage(path, session) {
  const res = await fetch(`${APP}${path}`, {
    headers: { cookie: sessionCookies(session).join("; ") },
    redirect: "manual",
  });
  return { status: res.status, body: await res.text() };
}

console.log("\n— anon boundaries —");
{
  const c = client();
  const { data } = await c.from("professional_cards").select("id");
  check("anon cannot read professional_cards", !data || data.length === 0);
  const { data: profs } = await c.from("professional_profiles").select("id");
  check("anon cannot read professional_profiles", !profs || profs.length === 0);
}

console.log("\n— client flow (client@example.com) —");
const grace = { id: null };
{
  const { c, session } = await login("client@example.com");

  const { data: cards } = await c.from("professional_cards").select("id, first_name, kind, tier");
  check("client sees 6 searchable cards", cards?.length === 6, `got ${cards?.length}`);
  grace.id = cards?.find((x) => x.first_name === "Grace")?.id ?? null;
  check("Grace present in search", Boolean(grace.id));

  const { data: fullBefore } = await c.from("professional_profiles").select("id").eq("id", grace.id);
  check("full profile hidden before unlock", (fullBefore ?? []).length === 0);

  const { data: bal0 } = await c.rpc("my_credit_balance");
  check("starting balance is 5", bal0 === 5, `got ${bal0}`);

  const { data: unlock, error: unlockErr } = await c.rpc("unlock_profile", { p_professional_id: grace.id });
  check("unlock_profile succeeds", !unlockErr && unlock, unlockErr?.message);

  const { data: bal1 } = await c.rpc("my_credit_balance");
  check("balance now 4", bal1 === 4, `got ${bal1}`);

  const { data: fullAfter } = await c.from("professional_profiles").select("id, bio, hourly_rate_min, compliance_status").eq("id", grace.id);
  check("full profile readable after unlock", fullAfter?.length === 1 && fullAfter[0].compliance_status === "green");

  await c.rpc("unlock_profile", { p_professional_id: grace.id });
  const { data: bal2 } = await c.rpc("my_credit_balance");
  check("re-unlock is free (still 4)", bal2 === 4, `got ${bal2}`);

  const { error: badUnlock } = await c.rpc("unlock_profile", { p_professional_id: "00000000-0000-0000-0000-000000000001" });
  check("unlocking unavailable profile rejected", badUnlock?.message.includes("profile_not_available"), badUnlock?.message);

  const { error: ledgerErr } = await c.from("credit_ledger").insert({ client_id: session.user.id, delta: 100, reason: "purchase" });
  check("client cannot forge credit_ledger rows", Boolean(ledgerErr));

  const { error: payErr } = await c.from("payments").insert({ user_id: session.user.id, kind: "credit_pack", amount: 0, provider: "test_bypass" });
  check("client cannot insert payments", Boolean(payErr));

  // authenticated page renders through the real Next server
  const dash = await getPage("/app/dashboard", session);
  check("GET /app/dashboard renders", dash.status === 200 && dash.body.includes("Sign out"), `status ${dash.status}`);
  const search = await getPage("/app/search", session);
  check("GET /app/search renders with Grace", search.status === 200 && search.body.includes("Grace"), `status ${search.status}`);
  const credits = await getPage("/app/credits", session);
  check("GET /app/credits shows balance 4", credits.status === 200 && credits.body.includes("4"), `status ${credits.status}`);
  const profilePage = await getPage(`/app/professionals/${grace.id}`, session);
  check("GET unlocked profile page renders bio", profilePage.status === 200 && profilePage.body.includes("Grace"), `status ${profilePage.status}`);
  const adminPage = await getPage("/app/admin", session);
  check("client blocked from /app/admin (redirect)", adminPage.status === 307, `status ${adminPage.status}`);
}

console.log("\n— professional flow (grace.carer@example.com) —");
{
  const { c, session } = await login("grace.carer@example.com");

  const { data: own } = await c.from("professional_profiles").select("id, tier, compliance_status, compliance_score").eq("id", session.user.id).single();
  check("professional reads own full profile", own?.compliance_status === "green" && own?.compliance_score === 90, JSON.stringify(own));

  const { error: tierErr } = await c.from("professional_profiles").update({ tier: "platinum" }).eq("id", session.user.id);
  check("professional cannot self-promote tier", Boolean(tierErr));

  const { error: availErr } = await c.rpc("confirm_availability");
  check("confirm_availability RPC works", !availErr, availErr?.message);

  const { data: otherFull } = await c.from("professional_profiles").select("id").neq("id", session.user.id);
  check("professional cannot read other full profiles", (otherFull ?? []).length === 0);

  const { data: doc, error: docErr } = await c.from("compliance_documents").insert({
    professional_id: session.user.id, doc_type: "qualification", title: "Verify test cert",
    storage_path: `${session.user.id}/qualification/test.pdf`,
  }).select().single();
  check("professional uploads doc metadata (pending)", !docErr && doc?.status === "pending_review", docErr?.message);

  const { data: ownAfterDoc } = await c.from("professional_profiles").select("compliance_status").eq("id", session.user.id).single();
  check("compliance recomputed on doc change (still green)", ownAfterDoc?.compliance_status === "green");

  const { error: delErr } = await c.from("compliance_documents").delete().eq("id", doc.id);
  check("professional deletes own pending doc", !delErr, delErr?.message);

  const { data: clientNames } = await c.from("profiles").select("first_name").neq("id", session.user.id);
  check("professional cannot read other profiles/names", (clientNames ?? []).length === 0);

  const proDash = await getPage("/app/pro", session);
  check("GET /app/pro renders compliance", proDash.status === 200 && proDash.body.toLowerCase().includes("compliance"), `status ${proDash.status}`);
  const docsPage = await getPage("/app/pro/documents", session);
  check("GET /app/pro/documents renders", docsPage.status === 200, `status ${docsPage.status}`);
}

console.log("\n— admin flow (admin@example.com) —");
{
  const { c, session } = await login("admin@example.com");

  const { data: allPros } = await c.from("professional_profiles").select("id");
  check("admin reads all professional profiles", allPros?.length === 6, `got ${allPros?.length}`);
  const { data: allPay } = await c.from("payments").select("id, provider");
  check("admin reads all payments", (allPay ?? []).length >= 1);

  const overview = await getPage("/app/admin", session);
  check("GET /app/admin renders overview", overview.status === 200, `status ${overview.status}`);
  const docs = await getPage("/app/admin/documents", session);
  check("GET /app/admin/documents renders", docs.status === 200, `status ${docs.status}`);
  const pros = await getPage("/app/admin/professionals", session);
  check("GET /app/admin/professionals lists Grace", pros.status === 200 && pros.body.includes("Grace"), `status ${pros.status}`);
  const proDetail = await getPage(`/app/admin/professionals/${grace.id}`, session);
  check("GET admin professional detail renders", proDetail.status === 200, `status ${proDetail.status}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
