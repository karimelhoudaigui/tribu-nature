create table if not exists public.travel_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_destinations text[] not null default '{}',
  preferred_activities text[] not null default '{}',
  preferred_accommodation text[] not null default '{}',
  food_preferences text[] not null default '{}',
  group_preferences text[] not null default '{}',
  personal_values text[] not null default '{}',
  availability_periods text[] not null default '{}',
  max_distance_km integer,
  preferred_group_size_min integer,
  preferred_group_size_max integer,
  updated_at timestamptz not null default now(),
  check (max_distance_km is null or max_distance_km >= 0),
  check (preferred_group_size_min is null or preferred_group_size_min > 0),
  check (preferred_group_size_max is null or preferred_group_size_max > 0),
  check (
    preferred_group_size_min is null
    or preferred_group_size_max is null
    or preferred_group_size_max >= preferred_group_size_min
  )
);

alter table public.travel_preferences enable row level security;

drop policy if exists "Users can read own travel preferences" on public.travel_preferences;
create policy "Users can read own travel preferences"
  on public.travel_preferences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own travel preferences" on public.travel_preferences;
create policy "Users can create own travel preferences"
  on public.travel_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own travel preferences" on public.travel_preferences;
create policy "Users can update own travel preferences"
  on public.travel_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.trips
add column if not exists region text,
add column if not exists country text,
add column if not exists accommodation_tags text[] not null default '{}',
add column if not exists food_tags text[] not null default '{}',
add column if not exists group_tags text[] not null default '{}',
add column if not exists safety_tags text[] not null default '{}',
add column if not exists value_tags text[] not null default '{}',
add column if not exists activity_tags text[] not null default '{}';

create index if not exists trips_activity_tags_idx on public.trips using gin (activity_tags);
create index if not exists trips_group_tags_idx on public.trips using gin (group_tags);
