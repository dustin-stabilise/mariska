-- ============================================================================
-- Roadmap v2 Phase 4: admin portal v2 - staff notes on clients.
-- Notes are an internal log (who wrote what, when), invisible to clients.
-- ============================================================================

create table public.staff_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index staff_notes_client_idx on public.staff_notes (client_id, created_at desc);

alter table public.staff_notes enable row level security;

create policy "staff notes: admin read" on public.staff_notes
  for select to authenticated
  using ((select public.is_admin()));

create policy "staff notes: admin writes own" on public.staff_notes
  for insert to authenticated
  with check ((select public.is_admin()) and author_id = (select auth.uid()));

create policy "staff notes: admin delete" on public.staff_notes
  for delete to authenticated
  using ((select public.is_admin()));

revoke update on public.staff_notes from authenticated;
revoke all on public.staff_notes from anon;
