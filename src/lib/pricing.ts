/**
 * All platform pricing in one place. Amounts in pence (GBP).
 * These feed both the UI and the payments layer (Stripe line items).
 */
export const PRICING = {
  currency: "gbp" as const,

  /** Credit pack: 5 profile unlocks for £25. */
  creditPack: {
    credits: 5,
    amount: 2500,
    label: "5 profile unlocks",
  },

  /** Fee per interview request. */
  interview: {
    amount: 1500,
    label: "Interview request",
  },

  /** One-off introduction (placement) fees, by professional type. */
  placement: {
    carer: { amount: 35000, label: "Carer introduction fee" },
    nurse: { amount: 65000, label: "Nurse introduction fee" },
  },

  /** Monthly support retainer subscription. */
  retainer: {
    amount: 5000,
    interval: "month" as const,
    label: "Ongoing support retainer",
    includedCredits: 5,
  },

  /** Referral payouts to professionals. */
  referral: {
    carer: 2500,
    specialistCarer: 5000,
    nurse: 7500,
  },

  /** Days an unlocked profile stays accessible. */
  unlockDurationDays: 30,
} as const;

export function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return pounds % 1 === 0 ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}
