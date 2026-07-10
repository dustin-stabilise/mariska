/**
 * Vetting requirements + certificate vocabulary (Roadmap v2 Phase 1).
 *
 * Grounded in Docs/research/compliance-brief.md §1-3: the sector-standard
 * mandatory training list (Skills for Care / Care Certificate framework) with
 * per-certificate refresher periods (decision 2026-07-08: per-certificate,
 * not blanket-annual). Validity is applied AT UPLOAD: expiry_date =
 * completion date + validityMonths, so the DB compliance engine only ever
 * compares dates.
 */

export type CertificateType = {
  value: string;
  label: string;
  /** null = does not expire (e.g. the Care Certificate itself) */
  validityMonths: number | null;
  /** required for a compliant profile (both kinds unless noted) */
  mandatory: boolean;
};

export const CERTIFICATE_TYPES: CertificateType[] = [
  { value: "care_certificate", label: "Care Certificate (15 standards)", validityMonths: null, mandatory: true },
  { value: "moving_handling", label: "Moving & handling of people", validityMonths: 12, mandatory: true },
  { value: "safeguarding_adults", label: "Safeguarding adults", validityMonths: 36, mandatory: true },
  { value: "safeguarding_children", label: "Safeguarding children", validityMonths: 36, mandatory: false },
  { value: "basic_life_support", label: "Basic life support", validityMonths: 12, mandatory: true },
  { value: "first_aid", label: "First aid", validityMonths: 36, mandatory: false },
  { value: "fire_safety", label: "Fire safety", validityMonths: 36, mandatory: true },
  { value: "food_hygiene", label: "Food hygiene & nutrition", validityMonths: 36, mandatory: true },
  { value: "infection_prevention", label: "Infection prevention & control", validityMonths: 36, mandatory: true },
  { value: "medication", label: "Medication administration", validityMonths: 12, mandatory: true },
  { value: "mca_dols", label: "Mental Capacity Act & DoLS", validityMonths: 36, mandatory: true },
  { value: "health_safety", label: "Health & safety awareness", validityMonths: 36, mandatory: true },
  { value: "information_governance", label: "Information governance / data handling", validityMonths: 12, mandatory: true },
];

export const MANDATORY_CERTIFICATE_VALUES = CERTIFICATE_TYPES.filter(
  (c) => c.mandatory
).map((c) => c.value);

export function certificateType(value: string): CertificateType | undefined {
  return CERTIFICATE_TYPES.find((c) => c.value === value);
}

/** expiry date for a certificate completed on `completionDate` (ISO date). */
export function certificateExpiry(
  type: string,
  completionDate: string
): string | null {
  const cert = certificateType(type);
  if (!cert || cert.validityMonths === null) return null;
  const d = new Date(`${completionDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + cert.validityMonths);
  return d.toISOString().slice(0, 10);
}

/**
 * Clinical skills checklist categories for nurses (brief §3, modelled on
 * standard agency competency checklists). Self-rated.
 */
export const CLINICAL_SKILL_LEVELS = ["novice", "competent", "expert"] as const;

export const CLINICAL_SKILLS: { value: string; label: string; group: string }[] = [
  { group: "Medication", value: "oral_topical_meds", label: "Oral / topical / PR / PV medication" },
  { group: "Medication", value: "injections", label: "IM & SC injections" },
  { group: "Medication", value: "iv_therapy", label: "IV therapy & infusion pumps" },
  { group: "Medication", value: "controlled_drugs", label: "Controlled drugs" },
  { group: "Medication", value: "syringe_drivers", label: "Syringe drivers" },
  { group: "Feeding", value: "peg_ng_feeding", label: "PEG / NG tube care & feeding" },
  { group: "Airway", value: "tracheostomy", label: "Tracheostomy care & suctioning" },
  { group: "Airway", value: "oxygen_nebulisers", label: "Oxygen therapy & nebulisers" },
  { group: "Continence", value: "catheterisation", label: "Urinary catheterisation & catheter care" },
  { group: "Continence", value: "bowel_stoma", label: "Bowel & stoma care" },
  { group: "Wounds", value: "wound_care", label: "Wound care & aseptic technique" },
  { group: "Wounds", value: "pressure_care", label: "Pressure ulcer prevention & grading" },
  { group: "Conditions", value: "diabetes", label: "Diabetes management (BG monitoring, insulin)" },
  { group: "Conditions", value: "epilepsy", label: "Epilepsy incl. rescue medication" },
  { group: "Conditions", value: "palliative", label: "End-of-life & palliative care" },
  { group: "Assessment", value: "vital_signs", label: "Vital signs & NEWS2" },
  { group: "Assessment", value: "venepuncture", label: "Venepuncture" },
];

/**
 * Required documents per profession (engine categories; the SQL scoring
 * mirrors this - keep the two in sync when either changes).
 * References remain 2× approved; proof of address is 2× approved.
 */
export const REQUIRED_DOCS = {
  carer: [
    "dbs",
    "right_to_work",
    "photo_id",           // passport
    "proof_of_address",   // ×2
    "reference",          // ×2
    "cv",
    "insurance",          // own PL + indemnity (decision 2026-07-08)
    // + all MANDATORY_CERTIFICATE_VALUES as training certificates
  ],
  nurse: [
    "dbs",
    "right_to_work",
    "photo_id",
    "proof_of_address",
    "reference",
    "cv",
    "insurance",          // professional indemnity (NMC condition)
    "nmc_registration",   // PIN + revalidation date as expiry
    "statement_of_entry",
    // + mandatory certificates + clinical skills checklist completed
  ],
} as const;

/** Current working-agreement version issued to professionals. */
export const CONTRACT_VERSION = "2026-07-draft-1";

/** Reg 36 early-start acknowledgment wording version (recorded per booking). */
export const CANCELLATION_ACK_VERSION = "2026-07-r36-1";

/** Current T&Cs versions recorded at signup acceptance. */
export const TERMS_VERSIONS = {
  client_terms: "2026-07-draft-1",
  professional_terms: "2026-07-draft-1",
} as const;
