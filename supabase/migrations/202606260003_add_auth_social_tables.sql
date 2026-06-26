create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Membre Tribu Nature',
  avatar_url text,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips
add column if not exists creator_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trips'
      and column_name = 'creator_id'
      and data_type <> 'uuid'
  ) then
    execute $sql$
      update public.trips
      set creator_id = null
      where creator_id is not null
        and creator_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    $sql$;

    execute $sql$
      alter table public.trips
      alter column creator_id type uuid using nullif(creator_id::text, '')::uuid
    $sql$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trips_creator_id_fkey'
  ) then
    alter table public.trips
    add constraint trips_creator_id_fkey
    foreign key (creator_id) references auth.users(id) on delete set null;
  end if;
end $$;

create table if not exists public.trip_interests (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.trip_join_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, requester_id),
  check (requester_id <> creator_id)
);

create table if not exists public.trip_participants (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('creator', 'participant')),
  status text not null default 'active' check (status in ('active', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists profiles_display_name_idx on public.profiles (display_name);
create index if not exists trips_creator_id_idx on public.trips (creator_id);
create index if not exists trip_interests_trip_id_idx on public.trip_interests (trip_id);
create index if not exists trip_interests_user_id_idx on public.trip_interests (user_id);
create index if not exists trip_join_requests_trip_id_idx on public.trip_join_requests (trip_id);
create index if not exists trip_join_requests_requester_id_idx on public.trip_join_requests (requester_id);
create index if not exists trip_join_requests_creator_id_idx on public.trip_join_requests (creator_id);
create index if not exists trip_participants_trip_id_idx on public.trip_participants (trip_id);
create index if not exists trip_participants_user_id_idx on public.trip_participants (user_id);

alter table public.profiles enable row level security;
alter table public.trip_interests enable row level security;
alter table public.trip_join_requests enable row level security;
alter table public.trip_participants enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Allow public insert community trips" on public.trips;
drop policy if exists "Allow public insert user project trips" on public.trips;

drop policy if exists "Authenticated users can create user project trips" on public.trips;
create policy "Authenticated users can create user project trips"
  on public.trips for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and community = true
    and card_type = 'user_project'
    and created_by_type = 'user'
    and visibility = 'public'
  );

drop policy if exists "Users can update own user project trips" on public.trips;
create policy "Users can update own user project trips"
  on public.trips for update
  to authenticated
  using (creator_id = auth.uid() and card_type = 'user_project')
  with check (creator_id = auth.uid() and card_type = 'user_project');

drop policy if exists "Users can delete own user project trips" on public.trips;
create policy "Users can delete own user project trips"
  on public.trips for delete
  to authenticated
  using (creator_id = auth.uid() and card_type = 'user_project');

drop policy if exists "Authenticated users can read trip interests" on public.trip_interests;
create policy "Authenticated users can read trip interests"
  on public.trip_interests for select
  to authenticated
  using (true);

drop policy if exists "Users can express their own trip interest" on public.trip_interests;
create policy "Users can express their own trip interest"
  on public.trip_interests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own trip interest" on public.trip_interests;
create policy "Users can update their own trip interest"
  on public.trip_interests for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own trip interest" on public.trip_interests;
create policy "Users can delete their own trip interest"
  on public.trip_interests for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read related join requests" on public.trip_join_requests;
create policy "Users can read related join requests"
  on public.trip_join_requests for select
  to authenticated
  using (requester_id = auth.uid() or creator_id = auth.uid());

drop policy if exists "Users can request to join projects" on public.trip_join_requests;
create policy "Users can request to join projects"
  on public.trip_join_requests for insert
  to authenticated
  with check (requester_id = auth.uid() and requester_id <> creator_id);

drop policy if exists "Users can update related join requests" on public.trip_join_requests;
create policy "Users can update related join requests"
  on public.trip_join_requests for update
  to authenticated
  using (requester_id = auth.uid() or creator_id = auth.uid())
  with check (
    (requester_id = auth.uid() and status = 'cancelled')
    or (creator_id = auth.uid() and status in ('accepted', 'rejected', 'pending'))
  );

drop policy if exists "Authenticated users can read trip participants" on public.trip_participants;
create policy "Authenticated users can read trip participants"
  on public.trip_participants for select
  to authenticated
  using (true);

drop policy if exists "Users can add themselves as trip participants" on public.trip_participants;
create policy "Users can add themselves as trip participants"
  on public.trip_participants for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own trip participation" on public.trip_participants;
create policy "Users can update their own trip participation"
  on public.trip_participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
