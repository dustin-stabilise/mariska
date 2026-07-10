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

/**
 * Display helpers derived from COMMISSION so every percentage in copy moves
 * with the config. The legal research (Docs/research/legal/00-overview.md)
 * flagged a likely fee flip (carer-side 15% -> single client-side fee);
 * when that decision lands, changing COMMISSION must update ALL copy.
 */
export const CARER_KEEPS_PCT = 100 - COMMISSION.carerPct;
export const CLIENT_FEE_PCT = COMMISSION.clientPct;

/** All-in hourly price a client pays for a carer's rate (pence -> pence). */
export function allInHourly(ratePence: number): number {
  return Math.round(ratePence * (1 + COMMISSION.clientPct / 100));
}

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

/** Remaining fixed prices: manual placement fees (admin tool) and referral
 * programme rewards. The credit/retainer/interview-fee model was removed
 * with the legacy pages (DR-0001). */
export const PRICING = {
  currency: "gbp" as const,

  /** One-off introduction (placement) fees, by professional type. */
  placement: {
    carer: { amount: 35000, label: "Carer introduction fee" },
    nurse: { amount: 65000, label: "Nurse introduction fee" },
  },

  /** Referral payouts to professionals. */
  referral: {
    carer: 2500,
    specialistCarer: 5000,
    nurse: 7500,
  },

} as const;

export function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return pounds % 1 === 0 ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}
