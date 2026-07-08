-- ============================================================================
-- Roadmap v2 Phase 3: scheduling & availability.
-- Decisions (2026-07-08): weekly digest email confirms via one-click signed
-- link; clients see carers' busy times (times only, never who) before
-- proposing a booking.
-- ============================================================================

-- Short pop-in visits become a work pattern on both sides.
alter type public.availability_option add value if not exists 'visits';

-- "Limited" availability gets structure: which days, plus a free note.
alter table public.professional_profiles
  add column limited_days text[] not null default '{}',   -- mon..sun
  add column limited_note text;

grant insert (limited_days, limited_note) on public.professional_profiles to authenticated;
grant update (limited_days, limited_note) on public.professional_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Time off: professional-managed unavailable date ranges
-- ---------------------------------------------------------------------------
create table public.unavailable_dates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  note text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index unavailable_dates_pro_idx on public.unavailable_dates (professional_id, starts_on);

alter table public.unavailable_dates enable row level security;

create policy "time off: read own or admin" on public.unavailable_dates
  for select to authenticated
  using (professional_id = (select auth.uid()) or (select public.is_admin()));

create policy "time off: manage own" on public.unavailable_dates
  for insert to authenticated
  with check (professional_id = (select auth.uid()));

create policy "time off: delete own" on public.unavailable_dates
  for delete to authenticated
  using (professional_id = (select auth.uid()));

revoke update on public.unavailable_dates from authenticated;
revoke all on public.unavailable_dates from anon;

-- ---------------------------------------------------------------------------
-- Busy view: what clients may see before proposing. Times only - confirmed
-- future bookings and time off; never client identities. Owned by postgres
-- (bypasses bookings RLS deliberately) with a restricted column set.
-- ---------------------------------------------------------------------------
create view public.professional_busy as
select
  b.professional_id,
  b.starts_at,
  b.ends_at,
  'booking'::text as kind
from public.bookings b
where b.status = 'confirmed'
  and b.ends_at > now()
union all
select
  u.professional_id,
  (u.starts_on)::timestamptz as starts_at,
  (u.ends_on + 1)::timestamptz as ends_at,
  'time_off'::text as kind
from public.unavailable_dates u
where u.ends_on >= current_date;

revoke all on public.professional_busy from anon, authenticated;
grant select on public.professional_busy to authenticated;

-- ---------------------------------------------------------------------------
-- Double-booking guard: accepting a proposal fails if it overlaps a
-- confirmed booking or time off.
-- ---------------------------------------------------------------------------
create or replace function public.accept_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
  v_candidate public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_candidate
  from public.bookings
  where id = p_booking_id
    and professional_id = v_uid
    and status = 'proposed';
  if not found then
    raise exception 'booking_not_acceptable';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.professional_id = v_uid
      and b.status = 'confirmed'
      and b.starts_at < v_candidate.ends_at
      and b.ends_at > v_candidate.starts_at
  ) then
    raise exception 'booking_clash';
  end if;

  if exists (
    select 1 from public.unavailable_dates u
    where u.professional_id = v_uid
      and u.starts_on <= (v_candidate.ends_at)::date
      and u.ends_on >= (v_candidate.starts_at)::date
  ) then
    raise exception 'booking_clash';
  end if;

  update public.bookings
  set status = 'confirmed', confirmed_at = now()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;
