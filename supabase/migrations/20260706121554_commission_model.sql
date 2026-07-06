-- ============================================================================
-- DR-0001: on-platform commission model.
-- Adds bookings + payouts, Stripe Connect fields, makes interviews free,
-- and opens full active profiles to signed-in clients (credits gating
-- retired; unlock tables stay dormant for now).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.booking_status as enum (
  'proposed',    -- client proposed, awaiting carer
  'confirmed',   -- carer accepted, awaiting payment/visit
  'completed',   -- visit done, confirmed by client (or auto)
  'cancelled',
  'disputed'
);

create type public.payout_status as enum ('pending', 'paid', 'failed');

alter type public.payment_kind add value if not exists 'booking';

-- ---------------------------------------------------------------------------
-- Stripe Connect fields on professionals
-- ---------------------------------------------------------------------------
alter table public.professional_profiles
  add column stripe_account_id text,
  add column payouts_enabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- bookings — the unit of on-platform care work
-- Money figures are snapshots in pence at proposal time so later pricing
-- changes never alter historical bookings.
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  status public.booking_status not null default 'proposed',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  hours numeric(6,2) not null check (hours > 0),
  hourly_rate int not null check (hourly_rate > 0),        -- carer's rate, pence
  client_fee_pct numeric(5,2) not null,                    -- e.g. 6.00
  carer_fee_pct numeric(5,2) not null,                     -- e.g. 15.00
  care_amount int not null,          -- hours * hourly_rate
  client_fee_amount int not null,    -- care_amount * client_fee_pct
  total_amount int not null,         -- care_amount + client_fee_amount (client pays)
  carer_fee_amount int not null,     -- care_amount * carer_fee_pct
  carer_net_amount int not null,     -- care_amount - carer_fee_amount (carer receives)
  payment_id uuid references public.payments (id),
  client_notes text,
  cancelled_reason text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index bookings_client_idx on public.bookings (client_id, starts_at desc);
create index bookings_pro_idx on public.bookings (professional_id, starts_at desc);
create index bookings_status_idx on public.bookings (status);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

create policy "bookings: read own side or admin" on public.bookings
  for select to authenticated
  using (
    client_id = (select auth.uid())
    or professional_id = (select auth.uid())
    or (select public.is_admin())
  );

-- All writes (creation, state transitions, money) go through server actions
-- with the service role or the RPCs below - no direct authenticated writes.
revoke insert, update, delete on public.bookings from authenticated;
revoke all on public.bookings from anon;

-- ---------------------------------------------------------------------------
-- payouts — carer-side money movement per completed booking
-- ---------------------------------------------------------------------------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount int not null check (amount > 0),   -- pence, carer_net_amount
  status public.payout_status not null default 'pending',
  provider public.payment_provider not null,
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index payouts_one_per_booking on public.payouts (booking_id);
create index payouts_pro_idx on public.payouts (professional_id, created_at desc);

alter table public.payouts enable row level security;

create policy "payouts: read own or admin" on public.payouts
  for select to authenticated
  using (professional_id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.payouts from authenticated;
revoke all on public.payouts from anon;

-- ---------------------------------------------------------------------------
-- Interviews become free meet-and-greets (payment optional already) with a
-- video link and duration.
-- ---------------------------------------------------------------------------
alter table public.interview_requests
  add column video_url text,
  add column duration_minutes int not null default 30;

-- ---------------------------------------------------------------------------
-- Free browse: any signed-in user can read ACTIVE, non-red professionals'
-- full profiles (contact details never lived in this table; coordination
-- stays on-platform). Unlock-based access remains for legacy rows.
-- ---------------------------------------------------------------------------
drop policy "pro profiles: read own, admin, or unlocked" on public.professional_profiles;

create policy "pro profiles: read active, own, admin, or unlocked" on public.professional_profiles
  for select to authenticated
  using (
    (select auth.uid()) = id
    or (select public.is_admin())
    or (
      status = 'active'
      and compliance_status <> 'red'
    )
    or exists (
      select 1 from public.profile_unlocks u
      where u.professional_id = professional_profiles.id
        and u.client_id = (select auth.uid())
        and u.expires_at > now()
    )
  );

-- Full-profile pages join the professional's profiles row (first name);
-- fold "active professionals are readable" into the existing own-or-admin
-- policy (single permissive policy keeps the RLS planner fast).
drop policy "profiles: read own or admin" on public.profiles;

create policy "profiles: read own, admin, or active professional" on public.profiles
  for select to authenticated
  using (
    (select auth.uid()) = id
    or (select public.is_admin())
    or exists (
      select 1 from public.professional_profiles pp
      where pp.id = profiles.id
        and pp.status = 'active'
        and pp.compliance_status <> 'red'
    )
  );

-- ---------------------------------------------------------------------------
-- Booking lifecycle RPCs for the two-sided transitions that don't touch
-- money. Creation/pricing/completion happen in server actions (they need
-- pricing config and payment plumbing).
-- ---------------------------------------------------------------------------

-- Carer accepts a proposed booking.
create or replace function public.accept_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.bookings
  set status = 'confirmed', confirmed_at = now()
  where id = p_booking_id
    and professional_id = v_uid
    and status = 'proposed'
  returning * into v_booking;

  if not found then
    raise exception 'booking_not_acceptable';
  end if;
  return v_booking;
end;
$$;

-- Either side cancels while not completed.
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_reason = p_reason
  where id = p_booking_id
    and (client_id = v_uid or professional_id = v_uid)
    and status in ('proposed', 'confirmed')
  returning * into v_booking;

  if not found then
    raise exception 'booking_not_cancellable';
  end if;
  return v_booking;
end;
$$;
