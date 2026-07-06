import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily compliance cron (see vercel.json):
 *  a) log expiry reminders for approved documents at the 60/30/7-day marks and
 *     on expiry - the reminder_log stands in for email/SMS sends for now;
 *  b) recompute compliance for every professional whose approved documents sit
 *     inside the 60-day horizon (expiry alone flips the score, scoring checks
 *     expiry_date > current_date);
 *  c) nudge active professionals whose availability confirmation is stale.
 */

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

type ExpiryKind = "expiry_60" | "expiry_30" | "expiry_7" | "expired";

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - todayUtc) / DAY_MS);
}

function expiryKind(daysLeft: number): ExpiryKind {
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 7) return "expiry_7";
  if (daysLeft <= 30) return "expiry_30";
  return "expiry_60";
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  const horizon = new Date(Date.now() + 60 * DAY_MS).toISOString().slice(0, 10);

  /* -------------------------------------------------------------- */
  /* (a) Document expiry reminders                                    */
  /* -------------------------------------------------------------- */

  const { data: docs, error: docsError } = await db
    .from("compliance_documents")
    .select("id, professional_id, doc_type, expiry_date")
    .eq("status", "approved")
    .not("expiry_date", "is", null)
    .lte("expiry_date", horizon);
  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }
  const expiringDocs = docs ?? [];

  // One reminder of each kind per document per 90 days.
  const ninetyDaysAgo = new Date(Date.now() - 90 * DAY_MS).toISOString();
  const docIds = expiringDocs.map((d) => d.id);
  const alreadySent = new Set<string>();
  if (docIds.length > 0) {
    const { data: recent } = await db
      .from("reminder_log")
      .select("document_id, kind")
      .in("document_id", docIds)
      .gte("sent_at", ninetyDaysAgo);
    for (const r of recent ?? []) {
      if (r.document_id) alreadySent.add(`${r.document_id}:${r.kind}`);
    }
  }

  const expiryInserts: {
    professional_id: string;
    document_id: string;
    kind: ExpiryKind;
  }[] = [];
  for (const doc of expiringDocs) {
    const kind = expiryKind(daysUntil(doc.expiry_date!));
    if (alreadySent.has(`${doc.id}:${kind}`)) continue;
    expiryInserts.push({
      professional_id: doc.professional_id,
      document_id: doc.id,
      kind,
    });
    console.log(
      `[cron/compliance] ${kind} reminder → professional ${doc.professional_id} ` +
        `(${doc.doc_type} expires ${doc.expiry_date})`
    );
  }
  if (expiryInserts.length > 0) {
    const { error } = await db.from("reminder_log").insert(expiryInserts);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* -------------------------------------------------------------- */
  /* (b) Recompute compliance inside the expiry horizon               */
  /* -------------------------------------------------------------- */

  const affectedPros = [...new Set(expiringDocs.map((d) => d.professional_id))];
  for (const professionalId of affectedPros) {
    const { error } = await db.rpc("compute_compliance", {
      p_professional_id: professionalId,
    });
    if (error) {
      console.error(
        `[cron/compliance] compute_compliance failed for ${professionalId}: ${error.message}`
      );
    }
  }

  /* -------------------------------------------------------------- */
  /* (c) Stale availability nudges (active pros, >7 days, max 1/7d)  */
  /* -------------------------------------------------------------- */

  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const { data: stalePros, error: staleError } = await db
    .from("professional_profiles")
    .select("id")
    .eq("status", "active")
    .lt("availability_confirmed_at", sevenDaysAgo);
  if (staleError) {
    return NextResponse.json({ error: staleError.message }, { status: 500 });
  }

  const staleIds = (stalePros ?? []).map((p) => p.id);
  const recentlyNudged = new Set<string>();
  if (staleIds.length > 0) {
    const { data: recent } = await db
      .from("reminder_log")
      .select("professional_id")
      .eq("kind", "availability")
      .in("professional_id", staleIds)
      .gte("sent_at", sevenDaysAgo);
    for (const r of recent ?? []) recentlyNudged.add(r.professional_id);
  }

  const availabilityInserts = staleIds
    .filter((id) => !recentlyNudged.has(id))
    .map((id) => ({ professional_id: id, kind: "availability" }));
  for (const insert of availabilityInserts) {
    console.log(
      `[cron/compliance] availability reminder → professional ${insert.professional_id}`
    );
  }
  if (availabilityInserts.length > 0) {
    const { error } = await db.from("reminder_log").insert(availabilityInserts);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = {
    ok: true,
    ranAt: nowIso,
    documentsInHorizon: expiringDocs.length,
    expiryReminders: expiryInserts.length,
    complianceRecomputed: affectedPros.length,
    staleAvailability: staleIds.length,
    availabilityReminders: availabilityInserts.length,
  };
  console.log("[cron/compliance] summary", summary);
  return NextResponse.json(summary);
}
