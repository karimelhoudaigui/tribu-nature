alter table public.profiles
drop constraint if exists profiles_id_fkey;

alter table public.profiles
add column if not exists age_range text,
add column if not exists verified boolean not null default false,
add column if not exists physical_level text,
add column if not exists budget_range text,
add column if not exists adventure_style text,
add column if not exists preferred_ambiences text[] not null default '{}',
add column if not exists safety_preferences text[] not null default '{}',
add column if not exists past_trips integer not null default 0,
add column if not exists badges text[] not null default '{}',
add column if not exists is_seed_profile boolean not null default false;

alter table public.trips
add column if not exists source_catalog_trip_id text references public.trips(id) on delete set null,
add column if not exists created_from_catalog boolean not null default false;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  related_trip_id text references public.trips(id) on delete cascade,
  related_user_id uuid,
  related_request_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  conversation_type text not null check (conversation_type in ('catalog_interest', 'user_project')),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table if not exists public.trip_favorites (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  inviter_id uuid not null,
  invited_user_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, inviter_id, invited_user_id)
);

create table if not exists public.tribe_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  receiver_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, receiver_id),
  check (requester_id <> receiver_id)
);

create index if not exists profiles_seed_idx on public.profiles (is_seed_profile);
create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_read_at_idx on public.notifications (read_at);
create index if not exists conversations_trip_id_idx on public.conversations (trip_id);
create index if not exists conversation_members_conversation_id_idx on public.conversation_members (conversation_id);
create index if not exists conversation_members_user_id_idx on public.conversation_members (user_id);
create index if not exists trip_favorites_user_id_idx on public.trip_favorites (user_id);
create index if not exists trip_favorites_trip_id_idx on public.trip_favorites (trip_id);
create index if not exists trip_invitations_inviter_id_idx on public.trip_invitations (inviter_id);
create index if not exists trip_invitations_invited_user_id_idx on public.trip_invitations (invited_user_id);
create index if not exists tribe_connections_requester_id_idx on public.tribe_connections (requester_id);
create index if not exists tribe_connections_receiver_id_idx on public.tribe_connections (receiver_id);
create index if not exists trips_source_catalog_trip_id_idx on public.trips (source_catalog_trip_id);

alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.trip_favorites enable row level security;
alter table public.trip_invitations enable row level security;
alter table public.tribe_connections enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Authenticated users can create notifications" on public.notifications;
create policy "Authenticated users can create notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

drop policy if exists "Users can mark own notifications" on public.notifications;
create policy "Users can mark own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Conversation members can read conversations" on public.conversations;
create policy "Conversation members can read conversations"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
  on public.conversations for insert
  to authenticated
  with check (true);

drop policy if exists "Conversation members can read members" on public.conversation_members;
create policy "Conversation members can read members"
  on public.conversation_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Users and trip creators can add conversation members" on public.conversation_members;
create policy "Users and trip creators can add conversation members"
  on public.conversation_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.conversations c
      join public.trips t on t.id = c.trip_id
      where c.id = conversation_members.conversation_id
        and t.creator_id = auth.uid()
    )
  );

drop policy if exists "Users can read own favorites" on public.trip_favorites;
create policy "Users can read own favorites"
  on public.trip_favorites for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can favorite trips" on public.trip_favorites;
create policy "Users can favorite trips"
  on public.trip_favorites for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can remove own favorites" on public.trip_favorites;
create policy "Users can remove own favorites"
  on public.trip_favorites for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read related invitations" on public.trip_invitations;
create policy "Users can read related invitations"
  on public.trip_invitations for select
  to authenticated
  using (inviter_id = auth.uid() or invited_user_id = auth.uid());

drop policy if exists "Users can invite to favorite trips" on public.trip_invitations;
create policy "Users can invite to favorite trips"
  on public.trip_invitations for insert
  to authenticated
  with check (inviter_id = auth.uid());

drop policy if exists "Users can update related invitations" on public.trip_invitations;
create policy "Users can update related invitations"
  on public.trip_invitations for update
  to authenticated
  using (inviter_id = auth.uid() or invited_user_id = auth.uid())
  with check (inviter_id = auth.uid() or invited_user_id = auth.uid());

drop policy if exists "Users can read related tribe connections" on public.tribe_connections;
create policy "Users can read related tribe connections"
  on public.tribe_connections for select
  to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can send tribe requests" on public.tribe_connections;
create policy "Users can send tribe requests"
  on public.tribe_connections for insert
  to authenticated
  with check (requester_id = auth.uid() and requester_id <> receiver_id);

drop policy if exists "Users can update related tribe requests" on public.tribe_connections;
create policy "Users can update related tribe requests"
  on public.tribe_connections for update
  to authenticated
  using (requester_id = auth.uid() or receiver_id = auth.uid())
  with check (requester_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can add themselves as trip participants" on public.trip_participants;
drop policy if exists "Users and creators can add trip participants" on public.trip_participants;
create policy "Users and creators can add trip participants"
  on public.trip_participants for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.trips t
      where t.id = trip_participants.trip_id
        and t.creator_id = auth.uid()
    )
  );

insert into public.profiles (
  id,
  email,
  display_name,
  avatar_url,
  city,
  bio,
  age_range,
  verified,
  physical_level,
  budget_range,
  adventure_style,
  preferred_ambiences,
  safety_preferences,
  past_trips,
  badges,
  is_seed_profile
) values
  ('00000000-0000-4000-8000-000000000001', 'sarah.demo@tribunature.local', 'Sarah', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80', 'Bordeaux', 'Envie de nature, de calme et de bons paysages, sans courir après la performance.', '29 ans', true, 'facile', '200 à 350 €', 'Calme et contemplation', array['nature', 'calme', 'découverte locale'], array['Profils vérifiés', 'Petit groupe', 'Groupe calme et respectueux'], 2, array['profil vérifié', 'rythme doux'], true),
  ('00000000-0000-4000-8000-000000000002', 'amine.demo@tribunature.local', 'Amine', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', 'Paris', 'Partant pour marcher, bien manger local et partager un week-end simple avec un bon groupe.', '31 ans', true, 'facile/intermédiaire', '200 à 350 €', 'Nature et repas local', array['randonnée facile', 'paysages', 'repas local'], array['Référent de Trip', 'Activités encadrées'], 3, array['fiable', '3 Trips'], true),
  ('00000000-0000-4000-8000-000000000003', 'lea.demo@tribunature.local', 'Léa', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', 'Toulouse', 'J''aime les villages, les producteurs et les aventures bien organisées mais pas rigides.', '34 ans', true, 'intermédiaire', 'flexible', 'Découverte locale', array['marchés', 'villages', 'fermes'], array['Petit groupe', 'Charte claire'], 5, array['référente', 'avis 4.9'], true),
  ('00000000-0000-4000-8000-000000000004', 'nora.demo@tribunature.local', 'Nora', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80', 'Nantes', 'Besoin de déconnexion, de paysages et d''un groupe doux où chacun a son rythme.', '27 ans', false, 'facile', '100 à 200 €', 'Slow life', array['déconnexion', 'paysages', 'calme'], array['Groupe mixte', 'Groupe calme et respectueux'], 1, array['nouvelle', 'slow life'], true),
  ('00000000-0000-4000-8000-000000000005', 'sofia.demo@tribunature.local', 'Sofia', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=80', 'Bordeaux', 'J''aime les week-ends nature, les randonnées accessibles et les repas locaux en petit groupe.', '28 ans', true, 'intermédiaire', '200 à 350 €', 'Calme & déconnexion', array['Calme & déconnexion', 'Montagne', 'Découverte locale'], array['Petit groupe', 'Profils vérifiés', 'Groupe calme et respectueux'], 4, array['profil vérifié', 'petit groupe', 'découverte locale'], true),
  ('00000000-0000-4000-8000-000000000006', 'yassine.demo@tribunature.local', 'Yassine', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=700&q=80', 'Bordeaux', 'Toujours partant pour une randonnée, un marché local et une ambiance simple sans pression.', '30 ans', true, 'facile/intermédiaire', '100 à 200 €', 'Nature calme', array['Montagne', 'Week-end', 'Repas local'], array['Groupe mixte', 'Activités encadrées'], 2, array['fiable', 'rythme doux', 'nature'], true),
  ('00000000-0000-4000-8000-000000000007', 'emma.demo@tribunature.local', 'Emma', 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=700&q=80', 'Lyon', 'J''aime les Alpes, les gîtes confortables et les aventures bien organisées avec des profils respectueux.', '26 ans', true, 'sportif', '350 à 500 €', 'Sport & dépassement', array['Alpes', 'Sport & dépassement', 'Premium & confort'], array['Profils vérifiés', 'Activités encadrées', 'Valeurs similaires'], 6, array['profil vérifié', 'sport', 'avis 4.8'], true),
  ('00000000-0000-4000-8000-000000000008', 'ines.demo@tribunature.local', 'Inès', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=700&q=80', 'Toulouse', 'Plutôt villages, producteurs, balades tranquilles et discussions autour d''un bon repas.', '33 ans', false, 'facile', '200 à 350 €', 'Découverte locale', array['Découverte locale', 'Campagne', 'Village'], array['Pauses personnelles respectées', 'Petit groupe'], 1, array['nouvelle', 'local', 'slow travel'], true)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  city = excluded.city,
  bio = excluded.bio,
  age_range = excluded.age_range,
  verified = excluded.verified,
  physical_level = excluded.physical_level,
  budget_range = excluded.budget_range,
  adventure_style = excluded.adventure_style,
  preferred_ambiences = excluded.preferred_ambiences,
  safety_preferences = excluded.safety_preferences,
  past_trips = excluded.past_trips,
  badges = excluded.badges,
  is_seed_profile = excluded.is_seed_profile,
  updated_at = now();
