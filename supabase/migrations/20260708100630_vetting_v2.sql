-- ============================================================================
-- Roadmap v2 Phase 1: vetting & onboarding hardening.
-- Decisions (2026-07-08): per-certificate refresher periods; carers hold own
-- insurance (required doc); recorded contract acceptance; RTW re-check on
-- expiry + 6-month sweep. Certificate vocabularies + validity periods live in
-- app code (src/lib/compliance-requirements.ts); expiry_date is computed at
-- upload from completion date + validity, so the engine only compares dates.
-- ============================================================================

-- New document types
alter type public.document_type add value if not exists 'driving_licence';
alter type public.document_type add value if not exists 'statement_of_entry';

-- Training certificates get a subtype (values from app vocabulary, e.g.
-- basic_life_support, moving_handling, safeguarding_adults...)
alter table public.compliance_documents
  add column certificate_type text;

grant insert (certificate_type) on public.compliance_documents to authenticated;
grant update (certificate_type) on public.compliance_documents to authenticated;

create index compliance_documents_cert_type_idx
  on public.compliance_documents (professional_id, certificate_type)
  where certificate_type is not null;

-- ---------------------------------------------------------------------------
-- Professional vetting fields
-- ---------------------------------------------------------------------------
alter table public.professional_profiles
  add column rtw_route text,                 -- british_irish_passport | share_code
  add column rtw_share_code text,
  add column rtw_checked_at timestamptz,     -- admin recorded the online check
  add column rtw_expires_at date,            -- time-limited permission expiry (null = indefinite)
  add column nmc_verified_at timestamptz,    -- admin verified live NMC register status
  add column can_drive boolean not null default false,
  add column clinical_skills jsonb not null default '{}'::jsonb,  -- { skill: novice|competent|expert }
  add column contract_version text,
  add column contract_accepted_at timestamptz,
  add column contract_accepted_ip text;

-- Professionals may set their route/share code, driving flag and clinical
-- skills; verification stamps and contract fields are server-side only
-- (contract acceptance goes through an RPC so version/IP can't be forged
-- piecemeal).
grant insert (rtw_route, rtw_share_code, can_drive, clinical_skills)
  on public.professional_profiles to authenticated;
grant update (rtw_route, rtw_share_code, can_drive, clinical_skills)
  on public.professional_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Terms acceptances (clients and professionals, versioned)
-- ---------------------------------------------------------------------------
create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document text not null,                    -- client_terms | professional_terms | privacy
  version text not null,
  accepted_at timestamptz not null default now(),
  ip text
);

create index terms_acceptances_user_idx on public.terms_acceptances (user_id, document);

alter table public.terms_acceptances enable row level security;

create policy "terms: read own or admin" on public.terms_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "terms: record own acceptance" on public.terms_acceptances
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke update, delete on public.terms_acceptances from authenticated;
revoke all on public.terms_acceptances from anon;

-- ---------------------------------------------------------------------------
-- Contract acceptance RPC: the professional accepts the issued agreement;
-- version comes from the issued contract (set by admin in contract_version
-- via service role), acceptance stamps time + IP together.
-- ---------------------------------------------------------------------------
create or replace function public.accept_contract(p_ip text default null)
returns public.professional_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.professional_profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.professional_profiles
  set contract_accepted_at = now(),
      contract_accepted_ip = p_ip
  where id = v_uid
    and contract_version is not null
    and contract_accepted_at is null
  returning * into v_row;

  if not found then
    raise exception 'no_contract_to_accept';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Compliance engine v2 (Phase 1 requirements).
-- KEEP IN SYNC with src/lib/compliance-requirements.ts (mandatory certificate
-- list + required docs). Carer max 100; nurse max 110.
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
  -- sync with MANDATORY_CERTIFICATE_VALUES in compliance-requirements.ts
  v_mandatory_certs text[] := array[
    'care_certificate','moving_handling','safeguarding_adults',
    'basic_life_support','fire_safety','food_hygiene',
    'infection_prevention','medication','mca_dols','health_safety',
    'information_governance'
  ];
  v_cert text;
  v_missing_cert boolean := false;
  v_expiring_cert boolean := false;
begin
  select * into v_pro from public.professional_profiles where id = p_professional_id;
  if not found then
    return;
  end if;

  -- DBS (15, required)
  if exists (
    select 1 from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'dbs'
      and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
  ) then
    v_score := v_score + 15;
    if not exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'dbs'
        and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > v_horizon)
    ) then v_amber := true; end if;
  else
    v_red := true;
  end if;

  -- Right to work (10, required): British/Irish passport route needs an
  -- approved passport (photo_id); share-code route needs a recorded check
  -- that hasn't lapsed.
  if (
    v_pro.rtw_route = 'british_irish_passport'
    and exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'photo_id'
        and d.status = 'approved'
    )
  ) or (
    v_pro.rtw_route = 'share_code'
    and v_pro.rtw_checked_at is not null
    and (v_pro.rtw_expires_at is null or v_pro.rtw_expires_at > current_date)
  ) then
    v_score := v_score + 10;
    if v_pro.rtw_route = 'share_code'
       and v_pro.rtw_expires_at is not null
       and v_pro.rtw_expires_at <= v_horizon then
      v_amber := true;
    end if;
  else
    v_red := true;
  end if;

  -- Passport / photo ID (5, required)
  if exists (
    select 1 from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'photo_id'
      and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
  ) then
    v_score := v_score + 5;
  else
    v_red := true;
  end if;

  -- Proof of address x2 (5, required)
  if (
    select count(*) from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'proof_of_address'
      and d.status = 'approved'
  ) >= 2 then
    v_score := v_score + 5;
  else
    v_red := true;
  end if;

  -- References x2 (10, required)
  if (
    select count(*) from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'reference'
      and d.status = 'approved'
  ) >= 2 then
    v_score := v_score + 10;
  else
    v_red := true;
  end if;

  -- CV (5, required)
  if exists (
    select 1 from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'cv'
      and d.status = 'approved'
  ) then
    v_score := v_score + 5;
  else
    v_red := true;
  end if;

  -- Insurance (10, required for all: carers own PL+PI, nurses indemnity)
  if exists (
    select 1 from public.compliance_documents d
    where d.professional_id = p_professional_id and d.doc_type = 'insurance'
      and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
  ) then
    v_score := v_score + 10;
    if not exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'insurance'
        and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > v_horizon)
    ) then v_amber := true; end if;
  else
    v_red := true;
  end if;

  -- Mandatory training set (20, required): every mandatory certificate type
  -- has an approved, unexpired document.
  foreach v_cert in array v_mandatory_certs loop
    if not exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id
        and d.doc_type = 'training_certificate'
        and d.certificate_type = v_cert
        and d.status = 'approved'
        and (d.expiry_date is null or d.expiry_date > current_date)
    ) then
      v_missing_cert := true;
    elsif not exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id
        and d.doc_type = 'training_certificate'
        and d.certificate_type = v_cert
        and d.status = 'approved'
        and (d.expiry_date is null or d.expiry_date > v_horizon)
    ) then
      v_expiring_cert := true;
    end if;
  end loop;
  if v_missing_cert then
    v_red := true;
  else
    v_score := v_score + 20;
    if v_expiring_cert then v_amber := true; end if;
  end if;

  -- Interview (10, required)
  if v_pro.interview_passed_at is not null then
    v_score := v_score + 10;
  else
    v_red := true;
  end if;

  -- Availability freshness (10)
  if v_pro.availability_confirmed_at > now() - interval '14 days' then
    v_score := v_score + 10;
  else
    v_amber := true;
  end if;

  -- Nurse extras
  if v_pro.kind = 'nurse' then
    -- NMC: registration doc valid (expiry = revalidation date), statement of
    -- entry approved, and live-register verification recorded (5, required)
    if exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'nmc_registration'
        and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > current_date)
    )
    and exists (
      select 1 from public.compliance_documents d
      where d.professional_id = p_professional_id and d.doc_type = 'statement_of_entry'
        and d.status = 'approved'
    )
    and v_pro.nmc_verified_at is not null then
      v_score := v_score + 5;
      if not exists (
        select 1 from public.compliance_documents d
        where d.professional_id = p_professional_id and d.doc_type = 'nmc_registration'
          and d.status = 'approved' and (d.expiry_date is null or d.expiry_date > v_horizon)
      ) then v_amber := true; end if;
    else
      v_red := true;
    end if;

    -- Clinical skills checklist completed: at least 10 rated skills (5, required)
    if (select count(*) from jsonb_object_keys(v_pro.clinical_skills)) >= 10 then
      v_score := v_score + 5;
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
