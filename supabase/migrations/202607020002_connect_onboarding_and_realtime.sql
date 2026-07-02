-- Structured onboarding preferences and scoped Realtime feeds.

alter table public.travel_preferences
add column if not exists departure_city text,
add column if not exists departure_lat double precision,
add column if not exists departure_lng double precision,
add column if not exists availability_start date,
add column if not exists availability_end date,
add column if not exists availability_flexible boolean not null default true,
add column if not exists budget_min integer,
add column if not exists budget_max integer,
add column if not exists physical_level text,
add column if not exists nature_types text[] not null default '{}',
add column if not exists preferred_ambiences text[] not null default '{}',
add column if not exists preferred_trip_durations text[] not null default '{}',
add column if not exists onboarding_step integer not null default 0,
add column if not exists onboarding_status text not null default 'draft',
add column if not exists onboarding_started_at timestamptz,
add column if not exists onboarding_completed_at timestamptz,
add column if not exists onboarding_skipped_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'travel_preferences_budget_check') then
    alter table public.travel_preferences add constraint travel_preferences_budget_check
      check (
        (budget_min is null or budget_min >= 0)
        and (budget_max is null or budget_max >= 0)
        and (budget_min is null or budget_max is null or budget_max >= budget_min)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'travel_preferences_availability_check') then
    alter table public.travel_preferences add constraint travel_preferences_availability_check
      check (availability_start is null or availability_end is null or availability_end >= availability_start);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'travel_preferences_onboarding_status_check') then
    alter table public.travel_preferences add constraint travel_preferences_onboarding_status_check
      check (onboarding_status in ('draft', 'skipped', 'completed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'travel_preferences_onboarding_step_check') then
    alter table public.travel_preferences add constraint travel_preferences_onboarding_step_check
      check (onboarding_step between 0 and 8);
  end if;
end $$;

update public.travel_preferences preference
set departure_city = coalesce(preference.departure_city, profile.city),
    physical_level = coalesce(preference.physical_level, profile.physical_level),
    preferred_ambiences = case
      when cardinality(preference.preferred_ambiences) = 0 then profile.preferred_ambiences
      else preference.preferred_ambiences
    end,
    budget_min = coalesce(preference.budget_min, case
      when profile.budget_range ilike '%moins de 100%' then 0
      when profile.budget_range ilike '%100 à 200%' then 100
      when profile.budget_range ilike '%200 à 350%' then 200
      when profile.budget_range ilike '%350 à 500%' then 350
      else null
    end),
    budget_max = coalesce(preference.budget_max, case
      when profile.budget_range ilike '%moins de 100%' then 100
      when profile.budget_range ilike '%100 à 200%' then 200
      when profile.budget_range ilike '%200 à 350%' then 350
      when profile.budget_range ilike '%350 à 500%' then 500
      else null
    end)
from public.profiles profile
where profile.id = preference.user_id;

create index if not exists travel_preferences_onboarding_idx
  on public.travel_preferences (onboarding_status, onboarding_step);

-- Realtime only publishes the social tables used by authenticated clients.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'notifications',
    'conversation_messages',
    'tribe_messages',
    'trip_join_requests',
    'trip_invitations',
    'tribe_connections',
    'trip_participants',
    'trip_interests',
    'trip_favorites',
    'conversation_members',
    'trip_confirmations',
    'user_blocks'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
