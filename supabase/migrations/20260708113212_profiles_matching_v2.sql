-- ============================================================================
-- Roadmap v2 Phase 2: profiles & matching v2.
-- Decisions (2026-07-08): profile photos require admin approval; default
-- search radius 15 miles, client-adjustable, live-in exempt; languages become
-- a fixed multi-select list (app vocabulary).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profile photos (3 per professional, admin-approved before display)
-- ---------------------------------------------------------------------------
create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  storage_path text not null,
  position int not null default 1 check (position between 1 and 3),
  status public.document_status not null default 'pending_review',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index profile_photos_pro_idx on public.profile_photos (professional_id, position);

alter table public.profile_photos enable row level security;

create policy "photos: read own, admin, or approved" on public.profile_photos
  for select to authenticated
  using (
    professional_id = (select auth.uid())
    or (select public.is_admin())
    or status = 'approved'
  );

create policy "photos: upload own" on public.profile_photos
  for insert to authenticated
  with check (professional_id = (select auth.uid()));

create policy "photos: delete own" on public.profile_photos
  for delete to authenticated
  using (professional_id = (select auth.uid()));

-- review columns are admin/service side
revoke insert, update on public.profile_photos from authenticated;
grant insert (professional_id, storage_path, position) on public.profile_photos to authenticated;
revoke all on public.profile_photos from anon;

-- Public bucket: paths are unguessable (uuid folders) and only approved
-- photos' URLs are ever surfaced in the product.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile photos: upload own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile photos: delete own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Location + new profile fields
-- ---------------------------------------------------------------------------
alter table public.professional_profiles
  add column postcode text,
  add column latitude double precision,
  add column longitude double precision,
  add column cooking_skill text;          -- basic | good | very_good | null

grant insert (postcode, latitude, longitude, cooking_skill)
  on public.professional_profiles to authenticated;
grant update (postcode, latitude, longitude, cooking_skill)
  on public.professional_profiles to authenticated;

alter table public.care_profiles
  add column postcode text,
  add column latitude double precision,
  add column longitude double precision,
  add column radius_miles int not null default 15 check (radius_miles between 1 and 100),
  add column live_in_room boolean not null default false,
  add column live_in_bathroom boolean not null default false;

-- ---------------------------------------------------------------------------
-- Search card view: photos, coords and the new matching fields
-- ---------------------------------------------------------------------------
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
  pp.hourly_rate_max,
  pp.can_drive,
  pp.cooking_skill,
  pp.latitude,
  pp.longitude,
  (
    select ph.storage_path from public.profile_photos ph
    where ph.professional_id = pp.id and ph.status = 'approved'
    order by ph.position asc
    limit 1
  ) as photo_path
from public.professional_profiles pp
join public.profiles pr on pr.id = pp.id
where pp.status = 'active'
  and pp.compliance_status <> 'red'
  and pp.availability_confirmed_at > now() - interval '30 days';

revoke all on public.professional_cards from anon, authenticated;
grant select on public.professional_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Professionals may read the care profile of clients they are actually
-- engaged with (an interview request or booking links them) so meet-and-greet
-- and visits come with context. Clients' profiles stay private otherwise.
-- ---------------------------------------------------------------------------
drop policy "care profiles: read own or admin" on public.care_profiles;

create policy "care profiles: read own, admin, or engaged professional" on public.care_profiles
  for select to authenticated
  using (
    client_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.interview_requests ir
      where ir.client_id = care_profiles.client_id
        and ir.professional_id = (select auth.uid())
    )
    or exists (
      select 1 from public.bookings b
      where b.client_id = care_profiles.client_id
        and b.professional_id = (select auth.uid())
    )
  );
