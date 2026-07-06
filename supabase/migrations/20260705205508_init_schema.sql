-- ============================================================================
-- Care introduction platform — initial schema
-- Roles: client / professional (carer|nurse) / admin (role in app_metadata).
-- Money flows: credit packs, profile unlocks, interview fees, placement fees,
-- retainer subscriptions, referral payouts.
-- Compliance: document vault + points scoring -> green/amber/red status;
-- red or stale-availability profiles drop out of search automatically.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('client', 'professional', 'admin');
create type public.professional_kind as enum ('carer', 'nurse');
create type public.professional_status as enum ('applied', 'in_review', 'active', 'suspended', 'rejected');
create type public.compliance_status as enum ('red', 'amber', 'green');
create type public.professional_tier as enum ('none', 'bronze', 'silver', 'gold', 'platinum');

create type public.care_category as enum (
  -- carer categories
  'live_in', 'day', 'night', 'dementia', 'end_of_life', 'complex', 'respite', 'companionship',
  -- nurse categories
  'general_nurse', 'community_nurse', 'dementia_nurse', 'palliative_nurse',
  'complex_nurse', 'learning_disability_nurse', 'mental_health_nurse'
);

create type public.availability_option as enum (
  'live_in', 'full_time', 'part_time', 'day_shifts', 'night_shifts',
  'weekends', 'temporary', 'long_term'
);
create type public.availability_status as enum ('available', 'limited', 'unavailable');

create type public.document_type as enum (
  'photo_id', 'proof_of_address', 'photo', 'dbs', 'right_to_work', 'cv',
  'qualification', 'training_certificate', 'reference', 'insurance',
  'nmc_registration', 'other'
);
create type public.document_status as enum ('pending_review', 'approved', 'rejected');

create type public.credit_reason as enum ('purchase', 'retainer_grant', 'admin_grant', 'unlock', 'refund');

create type public.payment_kind as enum ('credit_pack', 'interview_fee', 'placement_fee', 'retainer');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.payment_provider as enum ('stripe', 'test_bypass', 'manual');

create type public.interview_status as enum ('requested', 'accepted', 'scheduled', 'completed', 'declined', 'cancelled');
create type public.placement_status as enum ('pending', 'active', 'ended', 'replaced');
create type public.subscription_status as enum ('active', 'past_due', 'cancelled');
create type public.referral_kind as enum ('carer', 'specialist_carer', 'nurse');
create type public.referral_status as enum ('invited', 'registered', 'compliant', 'paid');
create type public.flag_reason as enum ('complaint', 'missed_interview', 'poor_reviews', 'safeguarding');
create type public.flag_status as enum ('open', 'in_review', 'resolved', 'dismissed');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  -- app_metadata is server-controlled (unlike user_metadata), safe for authz.
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select public.is_admin()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Owners may edit contact details but never their own role.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone) on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- professional_profiles — carers & nurses
-- ---------------------------------------------------------------------------
create table public.professional_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  kind public.professional_kind not null,
  status public.professional_status not null default 'applied',
  headline text not null default '',
  bio text not null default '',
  location text not null default '',
  region text not null default '',
  years_experience int not null default 0 check (years_experience between 0 and 70),
  care_categories public.care_category[] not null default '{}',
  availability_status public.availability_status not null default 'available',
  availability_options public.availability_option[] not null default '{}',
  availability_confirmed_at timestamptz not null default now(),
  hourly_rate_min int,          -- pence, set by the professional (guide only)
  hourly_rate_max int,
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  photo_url text,
  intro_video_url text,
  nmc_pin text,                 -- nurses only
  interview_passed_at timestamptz,
  tier public.professional_tier not null default 'none',
  compliance_status public.compliance_status not null default 'red',
  compliance_score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index professional_profiles_search_idx
  on public.professional_profiles (status, compliance_status, kind);
create index professional_profiles_categories_idx
  on public.professional_profiles using gin (care_categories);

create trigger professional_profiles_updated_at
  before update on public.professional_profiles
  for each row execute function public.set_updated_at();

alter table public.professional_profiles enable row level security;

create policy "pro profiles: insert own application" on public.professional_profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "pro profiles: update own" on public.professional_profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Professionals edit their own profile content, but never their vetting or
-- billing-relevant state (status, tier, compliance, interview sign-off).
revoke insert, update on public.professional_profiles from authenticated;
grant insert (
  id, kind, headline, bio, location, region, years_experience, care_categories,
  availability_status, availability_options, hourly_rate_min, hourly_rate_max,
  languages, interests, photo_url, intro_video_url, nmc_pin
) on public.professional_profiles to authenticated;
grant update (
  headline, bio, location, region, years_experience, care_categories,
  availability_status, availability_options, availability_confirmed_at,
  hourly_rate_min, hourly_rate_max, languages, interests, photo_url,
  intro_video_url, nmc_pin
) on public.professional_profiles to authenticated;
revoke all on public.professional_profiles from anon;

-- ---------------------------------------------------------------------------
-- compliance_documents — the vault
-- ---------------------------------------------------------------------------
create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  doc_type public.document_type not null,
  title text not null default '',
  storage_path text not null,
  issue_date date,
  expiry_date date,
  status public.document_status not null default 'pending_review',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_documents_pro_idx on public.compliance_documents (professional_id, doc_type);
create index compliance_documents_expiry_idx on public.compliance_documents (expiry_date)
  where status = 'approved';

create trigger compliance_documents_updated_at
  before update on public.compliance_documents
  for each row execute function public.set_updated_at();

alter table public.compliance_documents enable row level security;

create policy "documents: read own or admin" on public.compliance_documents
  for select to authenticated
  using (professional_id = (select auth.uid()) or (select public.is_admin()));

create policy "documents: upload own" on public.compliance_documents
  for insert to authenticated
  with check (professional_id = (select auth.uid()));

create policy "documents: edit own while pending" on public.compliance_documents
  for update to authenticated
  using (professional_id = (select auth.uid()) and status = 'pending_review')
  with check (professional_id = (select auth.uid()));

create policy "documents: delete own while pending" on public.compliance_documents
  for delete to authenticated
  using (professional_id = (select auth.uid()) and status = 'pending_review');

-- Review outcome columns are admin/service-side only.
revoke insert, update on public.compliance_documents from authenticated;
grant insert (professional_id, doc_type, title, storage_path, issue_date, expiry_date)
  on public.compliance_documents to authenticated;
grant update (title, storage_path, issue_date, expiry_date)
  on public.compliance_documents to authenticated;
revoke all on public.compliance_documents from anon;

-- ---------------------------------------------------------------------------
-- payments — one row per money event (Stripe or test bypass)
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.payment_kind not null,
  amount int not null check (amount >= 0),  -- pence
  currency text not null default 'gbp',
  status public.payment_status not null default 'pending',
  provider public.payment_provider not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index payments_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

create policy "payments: read own or admin" on public.payments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Writes happen through the service role only (checkout + webhooks).
revoke insert, update, delete on public.payments from authenticated;
revoke all on public.payments from anon;

-- ---------------------------------------------------------------------------
-- credit_ledger — append-only credit movements; balance = sum(delta)
-- ---------------------------------------------------------------------------
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null check (delta <> 0),
  reason public.credit_reason not null,
  payment_id uuid references public.payments (id),
  note text,
  created_at timestamptz not null default now()
);

create index credit_ledger_client_idx on public.credit_ledger (client_id, created_at desc);

alter table public.credit_ledger enable row level security;

create policy "credits: read own or admin" on public.credit_ledger
  for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.credit_ledger from authenticated;
revoke all on public.credit_ledger from anon;

-- ---------------------------------------------------------------------------
-- profile_unlocks — client access to full profiles, 30-day expiry
-- ---------------------------------------------------------------------------
create table public.profile_unlocks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index profile_unlocks_client_idx on public.profile_unlocks (client_id, expires_at desc);
create index profile_unlocks_pro_idx on public.profile_unlocks (professional_id);

alter table public.profile_unlocks enable row level security;

create policy "unlocks: read own or admin" on public.profile_unlocks
  for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_admin()));

-- Created only via the unlock_profile() function below.
revoke insert, update, delete on public.profile_unlocks from authenticated;
revoke all on public.profile_unlocks from anon;

-- Full professional profile row visible to: the professional themself, admins,
-- or a client holding an active (non-expired) unlock. Defined after
-- profile_unlocks so the policy can reference it.
create policy "pro profiles: read own, admin, or unlocked" on public.professional_profiles
  for select to authenticated
  using (
    (select auth.uid()) = id
    or (select public.is_admin())
    or exists (
      select 1 from public.profile_unlocks u
      where u.professional_id = professional_profiles.id
        and u.client_id = (select auth.uid())
        and u.expires_at > now()
    )
  );

-- ---------------------------------------------------------------------------
-- interview_requests
-- ---------------------------------------------------------------------------
create table public.interview_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  status public.interview_status not null default 'requested',
  payment_id uuid references public.payments (id),
  scheduled_at timestamptz,
  client_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_requests_client_idx on public.interview_requests (client_id, created_at desc);
create index interview_requests_pro_idx on public.interview_requests (professional_id, created_at desc);

create trigger interview_requests_updated_at
  before update on public.interview_requests
  for each row execute function public.set_updated_at();

alter table public.interview_requests enable row level security;

create policy "interviews: read own side or admin" on public.interview_requests
  for select to authenticated
  using (
    client_id = (select auth.uid())
    or professional_id = (select auth.uid())
    or (select public.is_admin())
  );

-- Creation goes through the paid request flow (service role). Both sides may
-- move the status on their own rows (accept/decline/cancel) — column grant
-- below limits them to the status column.
create policy "interviews: parties update own" on public.interview_requests
  for update to authenticated
  using (
    client_id = (select auth.uid())
    or professional_id = (select auth.uid())
  )
  with check (
    client_id = (select auth.uid())
    or professional_id = (select auth.uid())
  );

revoke insert, update, delete on public.interview_requests from authenticated;
grant update (status) on public.interview_requests to authenticated;
revoke all on public.interview_requests from anon;

-- ---------------------------------------------------------------------------
-- placements
-- ---------------------------------------------------------------------------
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  interview_id uuid references public.interview_requests (id),
  fee_amount int not null,      -- pence: 35000 carer / 65000 nurse
  payment_id uuid references public.payments (id),
  status public.placement_status not null default 'pending',
  started_at date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index placements_client_idx on public.placements (client_id);
create index placements_pro_idx on public.placements (professional_id);

create trigger placements_updated_at
  before update on public.placements
  for each row execute function public.set_updated_at();

alter table public.placements enable row level security;

create policy "placements: read own side or admin" on public.placements
  for select to authenticated
  using (
    client_id = (select auth.uid())
    or professional_id = (select auth.uid())
    or (select public.is_admin())
  );

revoke insert, update, delete on public.placements from authenticated;
revoke all on public.placements from anon;

-- ---------------------------------------------------------------------------
-- retainer_subscriptions
-- ---------------------------------------------------------------------------
create table public.retainer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  status public.subscription_status not null default 'active',
  provider public.payment_provider not null,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create unique index retainer_one_active_per_client
  on public.retainer_subscriptions (client_id)
  where status = 'active';

alter table public.retainer_subscriptions enable row level security;

create policy "retainers: read own or admin" on public.retainer_subscriptions
  for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.retainer_subscriptions from authenticated;
revoke all on public.retainer_subscriptions from anon;

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.professional_profiles (id) on delete cascade,
  referred_email text not null,
  referred_professional_id uuid references public.professional_profiles (id),
  kind public.referral_kind not null default 'carer',
  reward_amount int,            -- pence, set when paid
  status public.referral_status not null default 'invited',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index referrals_referrer_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

create policy "referrals: read own or admin" on public.referrals
  for select to authenticated
  using (referrer_id = (select auth.uid()) or (select public.is_admin()));

create policy "referrals: create own" on public.referrals
  for insert to authenticated
  with check (
    referrer_id = (select auth.uid())
    and exists (
      select 1 from public.professional_profiles p
      where p.id = (select auth.uid()) and p.status = 'active'
    )
  );

revoke insert, update, delete on public.referrals from authenticated;
grant insert (referrer_id, referred_email, kind) on public.referrals to authenticated;
revoke all on public.referrals from anon;

-- ---------------------------------------------------------------------------
-- safeguarding_flags — admin-only review queue
-- ---------------------------------------------------------------------------
create table public.safeguarding_flags (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  raised_by uuid references public.profiles (id),
  reason public.flag_reason not null,
  details text not null default '',
  status public.flag_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index safeguarding_flags_pro_idx on public.safeguarding_flags (professional_id, status);

alter table public.safeguarding_flags enable row level security;

create policy "flags: admin read" on public.safeguarding_flags
  for select to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.safeguarding_flags from authenticated;
revoke all on public.safeguarding_flags from anon;

-- ---------------------------------------------------------------------------
-- reminder_log — dedupe for expiry/availability reminders
-- ---------------------------------------------------------------------------
create table public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  document_id uuid references public.compliance_documents (id) on delete cascade,
  kind text not null,           -- expiry_60 | expiry_30 | expiry_7 | expired | availability
  sent_at timestamptz not null default now()
);

create index reminder_log_pro_idx on public.reminder_log (professional_id, kind, sent_at desc);

alter table public.reminder_log enable row level security;

create policy "reminders: admin read" on public.reminder_log
  for select to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.reminder_log from authenticated;
revoke all on public.reminder_log from anon;

-- ---------------------------------------------------------------------------
-- Search card view — the LIMITED profile every signed-in user may see.
-- Deliberately owned by postgres (bypasses RLS on the base tables) so it can
-- expose a restricted column set; the WHERE clause is the visibility rule:
-- active + not red + availability confirmed within 30 days.
-- ---------------------------------------------------------------------------
create view public.professional_cards as
select
  pp.id,
  pr.first_name,
  pp.kind,
  pp.headline,
  pp.location,
  pp.region,
  pp.years_experience,
  pp.care_categories,
  pp.availability_status,
  pp.availability_options,
  pp.languages,
  pp.tier
from public.professional_profiles pp
join public.profiles pr on pr.id = pp.id
where pp.status = 'active'
  and pp.compliance_status <> 'red'
  and pp.availability_confirmed_at > now() - interval '30 days';

revoke all on public.professional_cards from anon, authenticated;
grant select on public.professional_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Credit balance + unlock RPCs
-- ---------------------------------------------------------------------------
create or replace function public.my_credit_balance()
returns int
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::int
  from public.credit_ledger
  where client_id = auth.uid();
$$;

-- Atomically spends one credit and unlocks a profile for 30 days.
-- SECURITY DEFINER (writes to service-only tables); every path checks auth.uid().
create or replace function public.unlock_profile(p_professional_id uuid)
returns public.profile_unlocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_balance int;
  v_unlock public.profile_unlocks;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- one client's credit operations serialise on this lock
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  if not exists (
    select 1 from public.profiles where id = v_uid and role = 'client'
  ) then
    raise exception 'not_a_client';
  end if;

  -- must currently be searchable
  if not exists (
    select 1 from public.professional_profiles pp
    where pp.id = p_professional_id
      and pp.status = 'active'
      and pp.compliance_status <> 'red'
      and pp.availability_confirmed_at > now() - interval '30 days'
  ) then
    raise exception 'profile_not_available';
  end if;

  -- already unlocked and still active -> no charge
  select * into v_unlock
  from public.profile_unlocks
  where client_id = v_uid
    and professional_id = p_professional_id
    and expires_at > now()
  order by expires_at desc
  limit 1;
  if found then
    return v_unlock;
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_ledger
  where client_id = v_uid;

  if v_balance < 1 then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_ledger (client_id, delta, reason)
  values (v_uid, -1, 'unlock');

  insert into public.profile_unlocks (client_id, professional_id)
  values (v_uid, p_professional_id)
  returning * into v_unlock;

  return v_unlock;
end;
$$;

-- Weekly availability confirmation (professionals).
create or replace function public.confirm_availability()
returns void
language sql
set search_path = ''
as $$
  update public.professional_profiles
  set availability_confirmed_at = now()
  where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Compliance scoring
-- Points: DBS 20, right-to-work 20, references (2+) 10, training 20,
-- interview 10, availability fresh 10; nurses add insurance 5 + NMC 5.
-- red   = a required item missing/expired
-- amber = something expires within 60 days, or availability older than 14 days
-- green = everything valid
-- ---------------------------------------------------------------------------
create or replace function public.compute_compliance(p_professional_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pro public.professional_profiles;
  v_score int := 0;
  v_red boolean := false;
  v_amber boolean := false;
  v_horizon date := (now() + interval '60 days')::date;
begin
  select * into v_pro from public.professional_profiles where id = p_professional_id;
  if not found then
    return;
  end if;

  -- A document counts when approved and unexpired; it tints amber when its
  -- expiry falls within the 60-day reminder horizon.

  -- DBS (20, required)
  if exists (
    select 1 from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'dbs'
      and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
  ) then
    v_score := v_score + 20;
    if not exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'dbs'
        and d.status = 'approved'
        and (d.expiry_date is null or d.expiry_date > v_horizon)
    ) then v_amber := true; end if;
  else
    v_red := true;
  end if;

  -- Right to work (20, required)
  if exists (
    select 1 from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'right_to_work'
      and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
  ) then
    v_score := v_score + 20;
    if not exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'right_to_work'
        and d.status = 'approved'
        and (d.expiry_date is null or d.expiry_date > v_horizon)
    ) then v_amber := true; end if;
  else
    v_red := true;
  end if;

  -- References: at least two approved (10, required)
  if (
    select count(*) from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'reference'
      and d.status = 'approved'
  ) >= 2 then
    v_score := v_score + 10;
  else
    v_red := true;
  end if;

  -- Mandatory training current (20, required)
  if exists (
    select 1 from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'training_certificate'
      and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
  ) then
    v_score := v_score + 20;
    if not exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'training_certificate'
        and d.status = 'approved'
        and (d.expiry_date is null or d.expiry_date > v_horizon)
    ) then v_amber := true; end if;
  else
    v_red := true;
  end if;

  -- Interview completed (10, required)
  if v_pro.interview_passed_at is not null then
    v_score := v_score + 10;
  else
    v_red := true;
  end if;

  -- Availability updated (10)
  if v_pro.availability_confirmed_at > now() - interval '14 days' then
    v_score := v_score + 10;
  else
    v_amber := true;
  end if;

  -- Nurse extras (required for nurses)
  if v_pro.kind = 'nurse' then
    if exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'insurance'
        and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
    ) then
      v_score := v_score + 5;
      if not exists (
        select 1 from public.compliance_documents d
        where d.professional_id = p_professional_id and d.doc_type = 'insurance'
          and d.status = 'approved'
          and (d.expiry_date is null or d.expiry_date > v_horizon)
      ) then v_amber := true; end if;
    else
      v_red := true;
    end if;

    if exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'nmc_registration'
        and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
    ) then
      v_score := v_score + 5;
      if not exists (
        select 1 from public.compliance_documents d
        where d.professional_id = p_professional_id and d.doc_type = 'nmc_registration'
          and d.status = 'approved'
          and (d.expiry_date is null or d.expiry_date > v_horizon)
      ) then v_amber := true; end if;
    else
      v_red := true;
    end if;
  end if;

  update public.professional_profiles
  set compliance_score = v_score,
      compliance_status = case
        when v_red then 'red'::public.compliance_status
        when v_amber then 'amber'::public.compliance_status
        else 'green'::public.compliance_status
      end
  where id = p_professional_id;
end;
$$;

-- Recompute whenever the vault changes.
create or replace function public.compliance_documents_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.compute_compliance(coalesce(new.professional_id, old.professional_id));
  return coalesce(new, old);
end;
$$;

create trigger compliance_recompute
  after insert or update or delete on public.compliance_documents
  for each row execute function public.compliance_documents_changed();

-- ---------------------------------------------------------------------------
-- New-user handling: copy safe role into app_metadata, create profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_before()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  -- Respect a role already set server-side (admin API); otherwise accept only
  -- client/professional from signup metadata. 'admin' can never be
  -- self-assigned.
  v_role := coalesce(new.raw_app_meta_data ->> 'role', '');
  if v_role not in ('client', 'professional', 'admin') then
    v_role := coalesce(new.raw_user_meta_data ->> 'role', '');
    if v_role not in ('client', 'professional') then
      v_role := 'client';
    end if;
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_before
  before insert on auth.users
  for each row execute function public.handle_new_user_before();

create or replace function public.handle_new_user_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, first_name, last_name, phone)
  values (
    new.id,
    (new.raw_app_meta_data ->> 'role')::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_after
  after insert on auth.users
  for each row execute function public.handle_new_user_after();

-- The admin API (auth.admin.createUser) applies app_metadata in an UPDATE
-- after the initial insert, so keep profiles.role in sync on updates too.
create or replace function public.handle_user_role_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
begin
  if v_role in ('client', 'professional', 'admin')
     and v_role is distinct from (old.raw_app_meta_data ->> 'role') then
    update public.profiles
    set role = v_role::public.user_role
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_role_updated
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_role_sync();

-- ---------------------------------------------------------------------------
-- Storage: private bucket for compliance documents.
-- Path convention: <professional_uuid>/<doc_type>/<filename>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;

create policy "vault: professionals read own folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'compliance-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or (select public.is_admin()))
  );

create policy "vault: professionals upload own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'compliance-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "vault: professionals update own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'compliance-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'compliance-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "vault: professionals delete own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'compliance-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
