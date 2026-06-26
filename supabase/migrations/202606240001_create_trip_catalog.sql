create table if not exists public.trips (
  id text primary key,
  title text not null,
  destination text not null,
  image_url text not null,
  dates text not null,
  duration text not null,
  budget_min integer not null default 0,
  budget_max integer not null default 0,
  physical_level text not null,
  ambience_tags text[] not null default '{}',
  compatibility_score integer not null default 0,
  interested_count integer not null default 0,
  status text not null default 'Trip publiée',
  description text not null default '',
  activities text[] not null default '{}',
  generation_reasons text[] not null default '{}',
  matched_member_ids text[] not null default '{}',
  generated_activity_ids text[] not null default '{}',
  generated_itinerary jsonb,
  community boolean not null default false,
  created_by text,
  brief text,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.local_activities (
  id text primary key,
  destination_id text not null,
  lat double precision,
  lng double precision,
  name text not null,
  category text not null,
  duration text not null,
  estimated_price numeric not null default 0,
  physical_level text not null,
  ambience text[] not null default '{}',
  weather_compatible text[] not null default '{}',
  risk text not null default 'faible',
  booking_required boolean not null default false,
  group_friendly boolean not null default true,
  description text not null default '',
  image text not null,
  source text,
  external_url text,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_compatibility_score_idx on public.trips (compatibility_score desc);
create index if not exists trips_budget_idx on public.trips (budget_min, budget_max);
create index if not exists trips_physical_level_idx on public.trips (physical_level);
create index if not exists trips_ambience_tags_idx on public.trips using gin (ambience_tags);
create index if not exists local_activities_destination_id_idx on public.local_activities (destination_id);
create index if not exists local_activities_ambience_idx on public.local_activities using gin (ambience);

alter table public.trips enable row level security;
alter table public.local_activities enable row level security;

drop policy if exists "Trips are publicly readable" on public.trips;
create policy "Trips are publicly readable"
  on public.trips for select
  using (true);

drop policy if exists "Local activities are publicly readable" on public.local_activities;
create policy "Local activities are publicly readable"
  on public.local_activities for select
  using (true);
