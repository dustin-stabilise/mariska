-- ============================================================================
-- Matching questionnaire: client care profiles + carer-side matching fields.
-- Vocabularies (interest chips, care needs, schedules) live in application
-- code (src/lib/matching.ts) so they can grow without migrations; columns
-- stay as text[]/text. Health-adjacent questions are needs-based, not
-- diagnosis-based, and optional - deliberately light-touch.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- care_profiles - one per client, about the person needing care
-- ---------------------------------------------------------------------------
create table public.care_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles (id) on delete cascade,
  care_for text not null default 'parent',           -- self|parent|partner|relative|friend|other
  recipient_first_name text,
  age_band text,                                      -- under_65|65_74|75_84|85_plus
  care_needs text[] not null default '{}',
  schedule text[] not null default '{}',
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  personality_preference text not null default 'no_preference',  -- calm_quiet|warm_chatty|no_preference
  carer_gender_preference text not null default 'no_preference', -- female|male|no_preference
  has_pets boolean not null default false,
  smoking_household boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger care_profiles_updated_at
  before update on public.care_profiles
  for each row execute function public.set_updated_at();

alter table public.care_profiles enable row level security;

create policy "care profiles: read own or admin" on public.care_profiles
  for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_admin()));

create policy "care profiles: insert own" on public.care_profiles
  for insert to authenticated
  with check (client_id = (select auth.uid()));

create policy "care profiles: update own" on public.care_profiles
  for update to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy "care profiles: delete own" on public.care_profiles
  for delete to authenticated
  using (client_id = (select auth.uid()));

revoke all on public.care_profiles from anon;

-- ---------------------------------------------------------------------------
-- Carer-side matching fields
-- ---------------------------------------------------------------------------
alter table public.professional_profiles
  add column gender text,                                   -- female|male|null (optional)
  add column personality_style text,                        -- calm_quiet|warm_chatty|adaptable|null
  add column comfortable_with text[] not null default '{}'; -- pets|smoking_household

-- professionals may edit their own new fields (column-grant model)
grant update (gender, personality_style, comfortable_with)
  on public.professional_profiles to authenticated;
grant insert (gender, personality_style, comfortable_with)
  on public.professional_profiles to authenticated;

-- Expose the matching-relevant fields on the search card view.
create or replace view public.professional_cards as
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
  pp.tier,
  pp.interests,
  pp.gender,
  pp.personality_style,
  pp.comfortable_with,
  pp.hourly_rate_min,
  pp.hourly_rate_max
from public.professional_profiles pp
join public.profiles pr on pr.id = pp.id
where pp.status = 'active'
  and pp.compliance_status <> 'red'
  and pp.availability_confirmed_at > now() - interval '30 days';

revoke all on public.professional_cards from anon, authenticated;
grant select on public.professional_cards to authenticated;
