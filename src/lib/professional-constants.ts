import type { Database } from "@/lib/supabase/database.types";

/**
 * Shared vocabulary for the professional (carer/nurse) area - enum labels,
 * checkbox options and the compliance checklist definition. Plain module so
 * both server and client components can import it.
 */

export type CareCategory = Database["public"]["Enums"]["care_category"];
export type AvailabilityOption =
  Database["public"]["Enums"]["availability_option"];
export type AvailabilityStatus =
  Database["public"]["Enums"]["availability_status"];
export type DocumentType = Database["public"]["Enums"]["document_type"];
export type ReferralKind = Database["public"]["Enums"]["referral_kind"];
export type ProfessionalKind = Database["public"]["Enums"]["professional_kind"];

export const CARER_CATEGORIES: { value: CareCategory; label: string }[] = [
  { value: "live_in", label: "Live-in care" },
  { value: "day", label: "Daytime care" },
  { value: "night", label: "Night care" },
  { value: "dementia", label: "Dementia care" },
  { value: "end_of_life", label: "End-of-life care" },
  { value: "complex", label: "Complex care" },
  { value: "respite", label: "Respite care" },
  { value: "companionship", label: "Companionship" },
];

export const NURSE_CATEGORIES: { value: CareCategory; label: string }[] = [
  { value: "general_nurse", label: "General nurse" },
  { value: "community_nurse", label: "Community nurse" },
  { value: "dementia_nurse", label: "Dementia nurse" },
  { value: "palliative_nurse", label: "Palliative nurse" },
  { value: "complex_nurse", label: "Complex care nurse" },
  { value: "learning_disability_nurse", label: "Learning disability nurse" },
  { value: "mental_health_nurse", label: "Mental health nurse" },
];

export function careCategoriesFor(kind: ProfessionalKind) {
  return kind === "nurse" ? NURSE_CATEGORIES : CARER_CATEGORIES;
}

export const AVAILABILITY_OPTIONS: {
  value: AvailabilityOption;
  label: string;
}[] = [
  { value: "live_in", label: "Live-in" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "day_shifts", label: "Day shifts" },
  { value: "night_shifts", label: "Night shifts" },
  { value: "weekends", label: "Weekends" },
  { value: "temporary", label: "Temporary" },
  { value: "long_term", label: "Long-term" },
];

export const AVAILABILITY_STATUSES: {
  value: AvailabilityStatus;
  label: string;
  hint: string;
}[] = [
  { value: "available", label: "Available", hint: "Ready for new placements" },
  { value: "limited", label: "Limited", hint: "Some capacity for the right role" },
  { value: "unavailable", label: "Unavailable", hint: "Not taking new work right now" },
];

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  photo_id: "Photo ID",
  proof_of_address: "Proof of address",
  photo: "Profile photo",
  dbs: "DBS check",
  right_to_work: "Right to work",
  cv: "CV",
  qualification: "Qualification",
  training_certificate: "Training certificate",
  reference: "Reference",
  insurance: "Indemnity insurance",
  nmc_registration: "NMC registration",
  other: "Other",
};

export const DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as DocumentType[];

export const REFERRAL_KINDS: {
  value: ReferralKind;
  label: string;
}[] = [
  { value: "carer", label: "Carer" },
  { value: "specialist_carer", label: "Specialist carer" },
  { value: "nurse", label: "Nurse" },
];

/** The documents a professional must have approved to go compliant. */
export type RequiredDoc = {
  docType: DocumentType;
  label: string;
  count: number;
  blurb: string;
};

const CARER_REQUIRED_DOCS: RequiredDoc[] = [
  {
    docType: "dbs",
    label: "Enhanced DBS check",
    count: 1,
    blurb: "A current enhanced DBS certificate (ideally on the update service).",
  },
  {
    docType: "right_to_work",
    label: "Right to work",
    count: 1,
    blurb: "Passport, visa or share code proving your right to work in the UK.",
  },
  {
    docType: "reference",
    label: "Two references",
    count: 2,
    blurb: "Two professional references, at least one from a recent care role.",
  },
  {
    docType: "training_certificate",
    label: "Training certificate",
    count: 1,
    blurb: "Up-to-date care training, e.g. moving & handling or the Care Certificate.",
  },
];

const NURSE_REQUIRED_DOCS: RequiredDoc[] = [
  ...CARER_REQUIRED_DOCS,
  {
    docType: "nmc_registration",
    label: "NMC registration",
    count: 1,
    blurb: "Evidence of your current NMC registration matching your PIN.",
  },
  {
    docType: "insurance",
    label: "Indemnity insurance",
    count: 1,
    blurb: "Professional indemnity insurance covering independent nursing work.",
  },
];

export function requiredDocsFor(kind: ProfessionalKind): RequiredDoc[] {
  return kind === "nurse" ? NURSE_REQUIRED_DOCS : CARER_REQUIRED_DOCS;
}
