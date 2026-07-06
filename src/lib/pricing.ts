/**
 * All platform pricing in one place. Amounts in pence (GBP).
 * These feed both the UI and the payments layer (Stripe line items).
 */

/**
 * DR-0001: primary revenue is dual-sided commission on on-platform bookings.
 * Carers set their rates and keep 85%; clients pay the rate plus 6%.
 * ~21% blended take, inside the field-tested 20-24% norm.
 */
export const COMMISSION = {
  carerPct: 15,
  clientPct: 6,
} as const;

export function bookingAmounts(hours: number, hourlyRate: number) {
  const careAmount = Math.round(hours * hourlyRate);
  const clientFeeAmount = Math.round((careAmount * COMMISSION.clientPct) / 100);
  const carerFeeAmount = Math.round((careAmount * COMMISSION.carerPct) / 100);
  return {
    careAmount,
    clientFeeAmount,
    totalAmount: careAmount + clientFeeAmount,
    carerFeeAmount,
    carerNetAmount: careAmount - carerFeeAmount,
  };
}

/** Legacy introduction-fee pricing (retired as primary revenue by DR-0001;
 * kept while the old code paths remain in the tree). */
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
