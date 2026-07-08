import {
  CERTIFICATE_TYPES,
  CLINICAL_SKILLS,
} from "@/lib/compliance-requirements";

/**
 * Vetting v2 checklist builder - mirrors the compute_compliance SQL engine
 * (supabase/migrations/20260708100630_vetting_v2.sql) so professionals see
 * exactly what the score is measuring. Plain module, safe on server and
 * client. KEEP IN SYNC with the engine when requirements change.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_HORIZON_DAYS = 60;
const AVAILABILITY_FRESH_DAYS = 14;

/** Minimum rated clinical skills for a compliant nurse profile (mirrors SQL). */
export const MIN_RATED_SKILLS = 10;

export type ChecklistState =
  | "approved"
  | "pending"
  | "rejected"
  | "expiring"
  | "expired"
  | "missing"
  | "attention";

export const CHECKLIST_STATE_LABELS: Record<ChecklistState, string> = {
  approved: "Approved",
  pending: "In review",
  rejected: "Rejected",
  expiring: "Expiring soon",
  expired: "Expired",
  missing: "Missing",
  attention: "Action needed",
};

export const CHECKLIST_STATE_TONE: Record<
  ChecklistState,
  "good" | "warn" | "bad"
> = {
  approved: "good",
  expiring: "warn",
  pending: "warn",
  attention: "warn",
  rejected: "bad",
  expired: "bad",
  missing: "bad",
};

export type ChecklistItem = {
  key: string;
  label: string;
  blurb?: string;
  state: ChecklistState;
  /** Short status suffix, e.g. "1 of 2 approved" or "expires 3 Aug 2026". */
  detail?: string;
  /** Reviewer rejection notes, shown verbatim. */
  notes?: string | null;
  /** Where to act on this item, if not the documents page itself. */
  href?: string;
};

export type ChecklistGroup = {
  key: string;
  title: string;
  items: ChecklistItem[];
};

export type ChecklistDoc = {
  doc_type: string;
  certificate_type?: string | null;
  status: string;
  expiry_date: string | null;
  review_notes?: string | null;
};

export type ChecklistPro = {
  kind: string;
  rtw_route: string | null;
  rtw_share_code: string | null;
  rtw_checked_at: string | null;
  rtw_expires_at: string | null;
  nmc_verified_at: string | null;
  clinical_skills: unknown;
  interview_passed_at: string | null;
  availability_confirmed_at: string;
  contract_version: string | null;
  contract_accepted_at: string | null;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** How many skills the professional has rated (clinical_skills is a JSON map). */
export function ratedSkillCount(skills: unknown): number {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) return 0;
  return Object.keys(skills).length;
}

/**
 * Classify a set of documents that together satisfy one requirement
 * (`required` approved & unexpired copies needed, default 1).
 */
export function evaluateDocuments(
  docs: ChecklistDoc[],
  required = 1
): Pick<ChecklistItem, "state" | "detail" | "notes"> {
  const now = Date.now();
  const horizon = now + EXPIRY_HORIZON_DAYS * DAY_MS;
  const approved = docs.filter((d) => d.status === "approved");
  const valid = approved.filter(
    (d) => !d.expiry_date || new Date(d.expiry_date).getTime() > now
  );
  const countDetail =
    required > 1 ? `${valid.length} of ${required} approved` : undefined;

  if (valid.length >= required) {
    const lasting = valid.filter(
      (d) => !d.expiry_date || new Date(d.expiry_date).getTime() > horizon
    );
    if (lasting.length >= required) {
      return { state: "approved", detail: countDetail };
    }
    const soonest = valid
      .filter((d) => d.expiry_date)
      .sort((a, b) => a.expiry_date!.localeCompare(b.expiry_date!))[0];
    return {
      state: "expiring",
      detail: soonest?.expiry_date ? `expires ${fmt(soonest.expiry_date)}` : undefined,
    };
  }
  if (docs.some((d) => d.status === "pending_review")) {
    return { state: "pending", detail: countDetail };
  }
  if (approved.length > valid.length) {
    return { state: "expired", detail: "renewal needed" };
  }
  const rejected = docs.find((d) => d.status === "rejected");
  if (rejected) {
    return { state: "rejected", notes: rejected.review_notes ?? null };
  }
  return { state: "missing", detail: countDetail };
}

function rightToWorkItem(pro: ChecklistPro, photoIdDocs: ChecklistDoc[]): ChecklistItem {
  const base: ChecklistItem = {
    key: "right_to_work",
    label: "Right to work",
    blurb:
      "Proved with a British or Irish passport, or a Home Office share code. Choose your route in the right-to-work card.",
  } as ChecklistItem;

  if (pro.rtw_route === "british_irish_passport") {
    const doc = evaluateDocuments(photoIdDocs);
    const detail =
      doc.state === "approved"
        ? "covered by your approved passport"
        : doc.state === "pending"
          ? "passport in review"
          : doc.state === "missing"
            ? "upload your passport"
            : doc.detail;
    return { ...base, state: doc.state, detail, notes: doc.notes };
  }

  if (pro.rtw_route === "share_code") {
    if (pro.rtw_checked_at) {
      const now = Date.now();
      if (pro.rtw_expires_at) {
        const exp = new Date(pro.rtw_expires_at).getTime();
        if (exp <= now) {
          return { ...base, state: "expired", detail: "re-check needed" };
        }
        if (exp <= now + EXPIRY_HORIZON_DAYS * DAY_MS) {
          return { ...base, state: "expiring", detail: `expires ${fmt(pro.rtw_expires_at)}` };
        }
      }
      return { ...base, state: "approved", detail: `verified ${fmt(pro.rtw_checked_at)}` };
    }
    if (pro.rtw_share_code) {
      return { ...base, state: "pending", detail: "code saved, awaiting our check" };
    }
    return { ...base, state: "missing", detail: "add your share code" };
  }

  return { ...base, state: "missing", detail: "route not chosen" };
}

/**
 * The full v2 requirement checklist, grouped for display. Every item mirrors
 * a scored requirement in the SQL compliance engine.
 */
export function buildVettingChecklist(
  pro: ChecklistPro,
  docs: ChecklistDoc[]
): ChecklistGroup[] {
  const ofType = (t: string) => docs.filter((d) => d.doc_type === t);
  const item = (
    key: string,
    label: string,
    blurb: string,
    docsForItem: ChecklistDoc[],
    required = 1
  ): ChecklistItem => ({
    key,
    label,
    blurb,
    ...evaluateDocuments(docsForItem, required),
  });

  const groups: ChecklistGroup[] = [];

  groups.push({
    key: "identity",
    title: "Identity & right to work",
    items: [
      item(
        "dbs",
        "Enhanced DBS check",
        "A current enhanced DBS certificate, ideally on the update service.",
        ofType("dbs")
      ),
      rightToWorkItem(pro, ofType("photo_id")),
      item(
        "photo_id",
        "Passport (photo ID)",
        "A clear scan or photo of your current passport.",
        ofType("photo_id")
      ),
      item(
        "proof_of_address",
        "Two proofs of address",
        "Two recent documents showing your home address, e.g. a utility bill and a bank statement.",
        ofType("proof_of_address"),
        2
      ),
    ],
  });

  groups.push({
    key: "references",
    title: "References & CV",
    items: [
      item(
        "reference",
        "Two references",
        "Two professional references, at least one from a recent care role.",
        ofType("reference"),
        2
      ),
      item("cv", "CV", "An up-to-date CV covering your care experience.", ofType("cv")),
    ],
  });

  groups.push({
    key: "insurance",
    title: "Insurance",
    items: [
      item(
        "insurance",
        pro.kind === "nurse"
          ? "Professional indemnity insurance"
          : "Public liability & indemnity insurance",
        pro.kind === "nurse"
          ? "Indemnity cover for independent nursing work. Holding appropriate cover is an NMC condition."
          : "Cover in your own name as a self-employed carer. Policies are available from around £89 a year, so it's quicker and cheaper to arrange than it sounds.",
        ofType("insurance")
      ),
    ],
  });

  const trainingDocs = ofType("training_certificate");
  groups.push({
    key: "training",
    title: "Training certificates",
    items: CERTIFICATE_TYPES.filter((c) => c.mandatory).map((cert) =>
      item(
        `cert_${cert.value}`,
        cert.label,
        cert.validityMonths === null
          ? "Does not expire once achieved."
          : `Refreshed every ${cert.validityMonths} months.`,
        trainingDocs.filter((d) => d.certificate_type === cert.value)
      )
    ),
  });

  if (pro.kind === "nurse") {
    const rated = ratedSkillCount(pro.clinical_skills);
    groups.push({
      key: "nurse",
      title: "Nurse checks",
      items: [
        item(
          "nmc_registration",
          "NMC registration",
          "Evidence of your current registration matching your PIN. Its revalidation date is treated as the expiry.",
          ofType("nmc_registration")
        ),
        item(
          "statement_of_entry",
          "NMC statement of entry",
          "Your statement of entry to the NMC register.",
          ofType("statement_of_entry")
        ),
        {
          key: "nmc_verified",
          label: "NMC register verification",
          blurb: "Our team checks your PIN against the live NMC register.",
          state: pro.nmc_verified_at ? "approved" : "pending",
          detail: pro.nmc_verified_at
            ? `verified ${fmt(pro.nmc_verified_at)}`
            : "done by our team",
        },
        {
          key: "clinical_skills",
          label: "Clinical skills checklist",
          blurb: `Rate yourself on your clinical skills. At least ${MIN_RATED_SKILLS} of ${CLINICAL_SKILLS.length} must be rated.`,
          state: rated >= MIN_RATED_SKILLS ? "approved" : "attention",
          detail: `${rated} of ${CLINICAL_SKILLS.length} rated`,
          href: "/app/pro/skills",
        },
      ],
    });
  }

  const processItems: ChecklistItem[] = [
    {
      key: "interview",
      label: "Vetting interview",
      blurb:
        "A short video call with our team. We'll be in touch to schedule it once your documents are in.",
      state: pro.interview_passed_at ? "approved" : "pending",
      detail: pro.interview_passed_at
        ? `passed ${fmt(pro.interview_passed_at)}`
        : "arranged by our team",
    },
    {
      key: "availability",
      label: "Availability confirmed recently",
      blurb: `Confirm at least weekly; your profile counts as stale after ${AVAILABILITY_FRESH_DAYS} days.`,
      state:
        Date.now() - new Date(pro.availability_confirmed_at).getTime() <=
        AVAILABILITY_FRESH_DAYS * DAY_MS
          ? "approved"
          : "attention",
      detail: `last confirmed ${fmt(pro.availability_confirmed_at)}`,
      href: "/app/pro",
    },
  ];
  if (pro.contract_version) {
    processItems.push({
      key: "contract",
      label: "Working agreement accepted",
      blurb: "Review and accept the agreement our team has issued to you.",
      state: pro.contract_accepted_at ? "approved" : "attention",
      detail: pro.contract_accepted_at
        ? `accepted ${fmt(pro.contract_accepted_at)}`
        : `version ${pro.contract_version} awaiting your acceptance`,
      href: "/app/pro/contract",
    });
  }
  groups.push({
    key: "process",
    title: "Interview & agreement",
    items: processItems,
  });

  return groups;
}

/** Compact one-line stand-in for the per-certificate items (dashboard view). */
export function summariseTraining(group: ChecklistGroup): ChecklistItem {
  const total = group.items.length;
  const done = group.items.filter(
    (i) => i.state === "approved" || i.state === "expiring"
  ).length;
  const state: ChecklistState =
    done === total
      ? group.items.some((i) => i.state === "expiring")
        ? "expiring"
        : "approved"
      : group.items.some((i) => i.state === "pending")
        ? "pending"
        : "missing";
  return {
    key: "training_summary",
    label: "Mandatory training certificates",
    blurb:
      "Every mandatory course needs a current certificate. The full list is on your documents page.",
    state,
    detail: `${done} of ${total} types approved`,
    href: "/app/pro/documents",
  };
}
