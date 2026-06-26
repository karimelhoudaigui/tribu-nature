alter table public.trips
add column if not exists card_type text default 'catalog'
check (card_type in ('catalog', 'user_project'));

alter table public.trips
add column if not exists created_by_type text default 'platform'
check (created_by_type in ('platform', 'user'));

alter table public.trips
add column if not exists planning_status text default 'idea'
check (planning_status in ('idea', 'forming_group', 'planned', 'confirmed', 'cancelled'));

alter table public.trips
add column if not exists visibility text default 'public'
check (visibility in ('public', 'private', 'unlisted'));

alter table public.trips
add column if not exists moderation_status text default 'approved'
check (moderation_status in ('approved', 'pending', 'rejected'));

alter table public.trips
add column if not exists creator_name text;

alter table public.trips
add column if not exists creator_id text;

alter table public.trips
add column if not exists departure_city text;

alter table public.trips
add column if not exists max_participants integer default 6;

alter table public.trips
add column if not exists current_participants integer default 0;

alter table public.trips
add column if not exists conversation_id text;

update public.trips
set
  card_type = coalesce(card_type, 'catalog'),
  created_by_type = coalesce(created_by_type, 'platform'),
  planning_status = coalesce(planning_status, 'idea'),
  visibility = coalesce(visibility, 'public'),
  moderation_status = coalesce(moderation_status, 'approved'),
  community = coalesce(community, false)
where community is distinct from true;

update public.trips
set
  card_type = 'user_project',
  created_by_type = 'user',
  planning_status = coalesce(planning_status, 'planned'),
  visibility = coalesce(visibility, 'public'),
  moderation_status = coalesce(moderation_status, 'approved'),
  community = true,
  creator_name = coalesce(creator_name, created_by)
where community = true;

drop policy if exists "Allow public insert community trips" on public.trips;
drop policy if exists "Allow public insert user project trips" on public.trips;

-- Temporary MVP policy for private testing only.
-- For production, require authentication, creator_id = auth.uid()::text,
-- moderation, anti-spam controls, and stricter field validation.
create policy "Allow public insert user project trips"
  on public.trips
  for insert
  with check (
    community = true
    and card_type = 'user_project'
    and created_by_type = 'user'
    and visibility = 'public'
  );
