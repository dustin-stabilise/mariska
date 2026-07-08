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
const APP = process.env.APP_URL ?? "http://localhost:3000";

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
  check("full profile freely readable (commission model)", (fullBefore ?? []).length === 1);

  const { data: unlock, error: unlockErr } = await c.rpc("unlock_profile", { p_professional_id: grace.id });
  check("legacy unlock RPC still functional", !unlockErr && unlock, unlockErr?.message);

  const { data: fullAfter } = await c.from("professional_profiles").select("id, bio, hourly_rate_min, compliance_status").eq("id", grace.id);
  check("full profile readable after unlock", fullAfter?.length === 1 && fullAfter[0].compliance_status === "green");

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
  const profilePage = await getPage(`/app/professionals/${grace.id}`, session);
  check("GET unlocked profile page renders bio", profilePage.status === 200 && profilePage.body.includes("Grace"), `status ${profilePage.status}`);
  const adminPage = await getPage("/app/admin", session);
  check("client blocked from /app/admin (redirect)", adminPage.status === 307, `status ${adminPage.status}`);
}

console.log("\n— professional flow (grace.carer@example.com) —");
{
  const { c, session } = await login("grace.carer@example.com");

  const { data: own } = await c.from("professional_profiles").select("id, tier, compliance_status, compliance_score").eq("id", session.user.id).single();
  check("professional reads own full profile", own?.compliance_status === "green" && own?.compliance_score === 100, JSON.stringify(own));

  const { error: tierErr } = await c.from("professional_profiles").update({ tier: "platinum" }).eq("id", session.user.id);
  check("professional cannot self-promote tier", Boolean(tierErr));

  const { error: availErr } = await c.rpc("confirm_availability");
  check("confirm_availability RPC works", !availErr, availErr?.message);

  const { data: otherFull } = await c.from("professional_profiles").select("id").neq("id", session.user.id);
  check("professional sees other active profiles (free browse)", (otherFull ?? []).length === 5);

  const { data: doc, error: docErr } = await c.from("compliance_documents").insert({
    professional_id: session.user.id, doc_type: "qualification", title: "Verify test cert",
    storage_path: `${session.user.id}/qualification/test.pdf`,
  }).select().single();
  check("professional uploads doc metadata (pending)", !docErr && doc?.status === "pending_review", docErr?.message);

  const { data: ownAfterDoc } = await c.from("professional_profiles").select("compliance_status").eq("id", session.user.id).single();
  check("compliance recomputed on doc change (still green)", ownAfterDoc?.compliance_status === "green");

  const { error: delErr } = await c.from("compliance_documents").delete().eq("id", doc.id);
  check("professional deletes own pending doc", !delErr, delErr?.message);

  const { data: clientNames } = await c.from("profiles").select("first_name, role").neq("id", session.user.id);
  const nonPro = (clientNames ?? []).filter((r) => r.role !== "professional");
  check("professional cannot read client/admin profiles", nonPro.length === 0, JSON.stringify(nonPro));

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


// ───────────────────────────────────────────────────────────────────────────
// DR-0001 commission-model flows (appended)
// ───────────────────────────────────────────────────────────────────────────
console.log("\n— commission model: free browse + free interviews —");
{
  const { c } = await login("client@example.com");
  const { data: full } = await c.from("professional_profiles").select("id, bio").eq("id", grace.id);
  check("full profile readable WITHOUT unlock (free browse)", full?.length === 1);
  const { data: pros } = await c.from("professional_profiles").select("id").eq("status", "active");
  check("all active professionals fully readable", (pros?.length ?? 0) >= 6, `got ${pros?.length}`);
}

console.log("\n— booking lifecycle (propose → accept → cancel path) —");
{
  const client = await login("client@example.com");
  const pro = await login("grace.carer@example.com");

  // no direct insert allowed
  const { error: insErr } = await client.c.from("bookings").insert({
    client_id: client.session.user.id, professional_id: grace.id,
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 90000000).toISOString(),
    hours: 1, hourly_rate: 1, client_fee_pct: 0, carer_fee_pct: 0,
    care_amount: 1, client_fee_amount: 0, total_amount: 1,
    carer_fee_amount: 0, carer_net_amount: 1,
  });
  check("client cannot insert bookings directly (service-only)", Boolean(insErr));

  // create via the same server-side path the action uses (service role here,
  // mirroring createBookingProposal maths)
  const svc = createClient(URL_, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const starts = new Date(Date.now() + 86400000);
  const ends = new Date(starts.getTime() + 3 * 3600000);
  const rate = 1600; const hours = 3;
  const care = hours * rate;
  const { data: booking, error: bErr } = await svc.from("bookings").insert({
    client_id: client.session.user.id, professional_id: grace.id,
    starts_at: starts.toISOString(), ends_at: ends.toISOString(),
    hours, hourly_rate: rate, client_fee_pct: 6, carer_fee_pct: 15,
    care_amount: care,
    client_fee_amount: Math.round(care * 0.06),
    total_amount: care + Math.round(care * 0.06),
    carer_fee_amount: Math.round(care * 0.15),
    carer_net_amount: care - Math.round(care * 0.15),
  }).select().single();
  check("booking created (3h @ £16)", !bErr && booking?.status === "proposed", bErr?.message);
  check("fee split: client pays £50.88", booking?.total_amount === 5088, `got ${booking?.total_amount}`);
  check("fee split: carer nets £40.80", booking?.carer_net_amount === 4080, `got ${booking?.carer_net_amount}`);

  // both sides can read it
  const { data: cView } = await client.c.from("bookings").select("id").eq("id", booking.id);
  const { data: pView } = await pro.c.from("bookings").select("id").eq("id", booking.id);
  check("client sees booking", cView?.length === 1);
  check("professional sees booking", pView?.length === 1);

  // wrong party can't accept
  const { error: wrongAccept } = await client.c.rpc("accept_booking", { p_booking_id: booking.id });
  check("client cannot accept booking (carer-only RPC)", Boolean(wrongAccept));

  // carer accepts
  const { data: accepted, error: accErr } = await pro.c.rpc("accept_booking", { p_booking_id: booking.id });
  check("carer accepts booking", !accErr && accepted?.status === "confirmed", accErr?.message);

  // client cancels (allowed while confirmed)
  const { data: cancelled, error: canErr } = await client.c.rpc("cancel_booking", {
    p_booking_id: booking.id, p_reason: "verify-test cleanup",
  });
  check("client cancels confirmed booking", !canErr && cancelled?.status === "cancelled", canErr?.message);

  // interviews are free: request without any payment
  const { data: iv, error: ivErr } = await svc.from("interview_requests").insert({
    client_id: client.session.user.id, professional_id: grace.id, client_notes: "verify free interview",
  }).select().single();
  check("interview request created with no payment", !ivErr && iv?.payment_id === null, ivErr?.message);
  await svc.from("interview_requests").delete().eq("id", iv.id);
  await svc.from("bookings").delete().eq("id", booking.id);
}


// ───────────────────────────────────────────────────────────────────────────
// Matching questionnaire (care profiles + badges)
// ───────────────────────────────────────────────────────────────────────────
console.log("\n— matching: care profile + personalised search —");
{
  const client = await login("client@example.com");
  const svc = createClient(URL_, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  // client creates their own care profile (RLS: own row)
  const { error: upErr } = await client.c.from("care_profiles").upsert({
    client_id: client.session.user.id,
    care_for: "parent",
    care_needs: ["memory_support", "companionship"],
    schedule: ["live_in"],
    languages: ["English", "Igbo"],
    interests: ["gardening", "music"],
    personality_preference: "warm_chatty",
    carer_gender_preference: "female",
    has_pets: true,
    smoking_household: false,
  }, { onConflict: "client_id" });
  check("client saves own care profile", !upErr, upErr?.message);

  // RLS: a professional cannot read the client's care profile
  const pro = await login("grace.carer@example.com");
  const { data: leaked } = await pro.c.from("care_profiles").select("id");
  check("professional cannot read care profiles", (leaked ?? []).length === 0);

  // cards expose matching fields
  const { data: cards } = await client.c.from("professional_cards")
    .select("first_name, gender, interests, personality_style, comfortable_with");
  const graceCard = cards?.find((c) => c.first_name === "Grace");
  check("cards expose matching fields", graceCard?.gender === "female" && (graceCard?.interests ?? []).includes("gardening"));

  // personalised search page: Grace should badge as a great match;
  // Tom (male) should be excluded by the explicit female preference
  const page = await getPage("/app/search", client.session);
  check("search renders match badge", page.status === 200 && /Great match/.test(page.body), `status ${page.status}`);
  check("search shows a shared-interest reason", /You both enjoy/.test(page.body));
  check("gender-preference mismatch excluded (no Tom)", !/Tom/.test(page.body));

  // full profile page shows what-you-share
  const graceId = (await client.c.from("professional_cards").select("id, first_name")).data
    ?.find((c) => c.first_name === "Grace")?.id;
  const profilePage = await getPage(`/app/professionals/${graceId}`, client.session);
  check("profile page renders 'What you share'", profilePage.status === 200 && /What you share/.test(profilePage.body), `status ${profilePage.status}`);

  // care-profile page renders in edit mode
  const cpPage = await getPage("/app/care-profile", client.session);
  check("care profile page renders", cpPage.status === 200, `status ${cpPage.status}`);

  // clean up so repeated runs stay deterministic
  await svc.from("care_profiles").delete().eq("client_id", client.session.user.id);
}

// ───────────────────────────────────────────────────────────────────────────
// Vetting v2 (Phase 1): engine, terms acceptances, contract gate
// ───────────────────────────────────────────────────────────────────────────
console.log("\n— vetting v2: engine, terms, contracts —");
{
  const svc = createClient(URL_, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  // seeded pros satisfy the stricter engine
  const { data: pros } = await svc.from("professional_profiles").select("kind, compliance_status, compliance_score");
  check("all seeded pros green under engine v2", (pros ?? []).every((p) => p.compliance_status === "green"));
  check("carer max 100 / nurse max 110", (pros ?? []).every((p) => p.compliance_score === (p.kind === "nurse" ? 110 : 100)));

  // terms acceptances: own-row insert only
  const client = await login("client@example.com");
  const { error: okIns } = await client.c.from("terms_acceptances").insert({
    user_id: client.session.user.id, document: "client_terms", version: "verify-test",
  });
  check("user records own terms acceptance", !okIns, okIns?.message);
  const grace = await login("grace.carer@example.com");
  const { error: forgeErr } = await grace.c.from("terms_acceptances").insert({
    user_id: client.session.user.id, document: "client_terms", version: "forged",
  });
  check("cannot record acceptance for another user", Boolean(forgeErr));
  const { data: leaked } = await grace.c.from("terms_acceptances").select("id").eq("user_id", client.session.user.id);
  check("cannot read others' acceptances", (leaked ?? []).length === 0);
  await svc.from("terms_acceptances").delete().eq("version", "verify-test");

  // contract lifecycle on a temp professional
  const { data: tmp } = await svc.auth.admin.createUser({
    email: "verify.contract@example.com", password: "password123", email_confirm: true,
    app_metadata: { role: "professional" }, user_metadata: { first_name: "Verify", last_name: "Contract" },
  });
  await svc.from("professional_profiles").insert({ id: tmp.user.id, kind: "carer", location: "Test", years_experience: 3 });
  const tempPro = createClient(URL_, PUB, { auth: { persistSession: false } });
  await tempPro.auth.signInWithPassword({ email: "verify.contract@example.com", password: "password123" });

  const { error: noContract } = await tempPro.rpc("accept_contract", { p_ip: "127.0.0.1" });
  check("accept_contract fails before issue", noContract?.message.includes("no_contract_to_accept"), noContract?.message);

  await svc.from("professional_profiles").update({ contract_version: "verify-1" }).eq("id", tmp.user.id);
  const { data: accepted, error: accErr } = await tempPro.rpc("accept_contract", { p_ip: "127.0.0.1" });
  check("accept_contract stamps acceptance", !accErr && accepted?.contract_accepted_at != null, accErr?.message);
  const { error: twiceErr } = await tempPro.rpc("accept_contract", { p_ip: "127.0.0.1" });
  check("acceptance cannot be re-stamped", Boolean(twiceErr));

  // fresh professional with no docs is red
  const { data: fresh } = await svc.from("professional_profiles").select("compliance_status").eq("id", tmp.user.id).single();
  check("fresh professional is red (no docs)", fresh?.compliance_status === "red");

  await svc.auth.admin.deleteUser(tmp.user.id);
}

// ───────────────────────────────────────────────────────────────────────────
// Phase 2: photos RLS, distance matching, engaged-professional care summary
// ───────────────────────────────────────────────────────────────────────────
console.log("\n— phase 2: photos, distance, care summary access —");
{
  const svc = createClient(URL_, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const client = await login("client@example.com");
  const grace2 = await login("grace.carer@example.com");

  // pending photo invisible to clients, visible after approval
  const { data: photo } = await svc.from("profile_photos").insert({
    professional_id: grace2.session.user.id, storage_path: grace2.session.user.id + "/test.jpg", position: 1,
  }).select().single();
  const { data: pendingSeen } = await client.c.from("profile_photos").select("id").eq("id", photo.id);
  check("pending photo hidden from clients", (pendingSeen ?? []).length === 0);
  await svc.from("profile_photos").update({ status: "approved" }).eq("id", photo.id);
  const { data: approvedSeen } = await client.c.from("profile_photos").select("id").eq("id", photo.id);
  check("approved photo visible to clients", (approvedSeen ?? []).length === 1);
  const { data: cardPhoto } = await client.c.from("professional_cards").select("photo_path").eq("id", grace2.session.user.id).single();
  check("card exposes approved photo path", cardPhoto?.photo_path === grace2.session.user.id + "/test.jpg");
  await svc.from("profile_photos").delete().eq("id", photo.id);

  // distance matching: client in central Manchester, 15 mile radius
  await svc.from("care_profiles").upsert({
    client_id: client.session.user.id, care_for: "parent",
    care_needs: ["memory_support", "meals", "needs_driver"], schedule: ["daytime"],
    languages: ["English"], interests: ["gardening"],
    personality_preference: "no_preference", carer_gender_preference: "no_preference",
    has_pets: false, smoking_household: false,
    postcode: "M2 4WU", latitude: 53.4808, longitude: -2.2426, radius_miles: 15,
  }, { onConflict: "client_id" });
  const { data: cp } = await svc.from("care_profiles").select("*").eq("client_id", client.session.user.id).single();
  const { data: cards } = await client.c.from("professional_cards").select("*");
  const { computeMatch } = await import("../src/lib/matching");
  const results = (cards ?? []).map((c) => ({ name: c.first_name, m: computeMatch(cp, c) }));
  const included = results.filter((r) => r.m.score !== null).map((r) => r.name);
  check("distance: only Manchester carer within 15 miles", included.length === 1 && included[0] === "Grace", JSON.stringify(included));
  const graceResult = results.find((r) => r.name === "Grace");
  check("distance reason present", graceResult.m.reasons.some((r) => /miles away/.test(r)), JSON.stringify(graceResult.m.reasons));
  check("driver + cook scoring live (score includes both)", graceResult.m.score === 55, JSON.stringify(graceResult.m));

  // engaged professional reads care profile only when linked
  const { data: before } = await grace2.c.from("care_profiles").select("id").eq("client_id", client.session.user.id);
  check("unengaged professional cannot read care profile", (before ?? []).length === 0);
  const { data: iv } = await svc.from("interview_requests").insert({
    client_id: client.session.user.id, professional_id: grace2.session.user.id,
  }).select().single();
  const { data: after } = await grace2.c.from("care_profiles").select("care_needs").eq("client_id", client.session.user.id);
  check("engaged professional reads care profile", (after ?? []).length === 1);
  await svc.from("interview_requests").delete().eq("id", iv.id);
  await svc.from("care_profiles").delete().eq("client_id", client.session.user.id);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
