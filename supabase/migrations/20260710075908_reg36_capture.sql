-- ============================================================================
-- No-regrets legal changes (Docs/research/legal/00-overview.md):
-- Consumer Contracts Regulations 2013 reg 36 capture. Where a client wants
-- care to begin within the 14-day cancellation period, their express request
-- and acknowledgment are recorded per booking, timestamped at payment.
-- ============================================================================

alter table public.bookings
  add column early_start_requested_at timestamptz,
  add column cancellation_ack_version text;
