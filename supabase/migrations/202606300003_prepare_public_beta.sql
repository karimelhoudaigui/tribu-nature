-- beta-step: trip-and-profile-contract
alter table public.trips
add column if not exists image_urls text[] not null default '{}',
add column if not exists start_date date,
add column if not exists end_date date,
add column if not exists date_precision text not null default 'flexible',
add column if not exists departure_lat double precision,
add column if not exists departure_lng double precision;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trips_date_precision_check'
  ) then
    alter table public.trips
    add constraint trips_date_precision_check
    check (date_precision in ('flexible', 'month', 'exact'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'trips_date_range_check'
  ) then
    alter table public.trips
    add constraint trips_date_range_check
    check (start_date is null or end_date is null or end_date >= start_date);
  end if;
end $$;

update public.trips
set image_urls = array[image_url]
where cardinality(image_urls) = 0
  and nullif(trim(image_url), '') is not null;

create index if not exists trips_end_date_idx on public.trips (end_date)
where end_date is not null;

alter table public.profiles
add column if not exists last_seen_at timestamptz,
add column if not exists preferred_language text not null default 'fr';

create or replace view public.public_profiles
with (security_invoker = false, security_barrier = true)
as
select
  id,
  display_name,
  avatar_url,
  avatar_path,
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
  is_seed_profile,
  last_seen_at,
  preferred_language,
  created_at,
  updated_at
from public.profiles;

grant select on public.public_profiles to authenticated;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can read own private profile" on public.profiles;
create policy "Users can read own private profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create or replace function public.is_conversation_member(conversation_key text, member_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.conversation_members member
    where member.conversation_id = conversation_key
      and member.user_id = member_id
  );
$$;

grant execute on function public.is_conversation_member(text, uuid) to authenticated;

drop policy if exists "Authenticated users can read conversations" on public.conversations;
drop policy if exists "Conversation members can read conversations" on public.conversations;
create policy "Conversation members can read conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_member(id));

drop policy if exists "Authenticated users can read conversation members" on public.conversation_members;
drop policy if exists "Conversation members can read members" on public.conversation_members;
create policy "Conversation members can read members"
  on public.conversation_members for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "Trips are publicly readable" on public.trips;
drop policy if exists "Public trips and member trips are readable" on public.trips;
create policy "Public trips and member trips are readable"
  on public.trips for select
  using (
    visibility = 'public'
    or creator_id = auth.uid()
    or exists (
      select 1 from public.trip_participants participant
      where participant.trip_id = trips.id
        and participant.user_id = auth.uid()
        and participant.status = 'active'
    )
  );

create or replace function public.touch_my_presence()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  touched_at timestamptz := now();
begin
  update public.profiles
  set last_seen_at = touched_at
  where id = auth.uid();

  return touched_at;
end;
$$;

grant execute on function public.touch_my_presence() to authenticated;

-- beta-step: message-contract
alter table public.conversation_messages
add column if not exists image_paths text[] not null default '{}',
add column if not exists updated_at timestamptz;

alter table public.tribe_messages
add column if not exists image_paths text[] not null default '{}',
add column if not exists updated_at timestamptz;

create table if not exists public.conversation_message_reads (
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_message_reads_user_id_idx
  on public.conversation_message_reads (user_id, last_read_at desc);

alter table public.conversation_message_reads enable row level security;

drop policy if exists "Users can read own conversation receipts" on public.conversation_message_reads;
create policy "Users can read own conversation receipts"
  on public.conversation_message_reads for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own conversation receipts" on public.conversation_message_reads;
create policy "Users can create own conversation receipts"
  on public.conversation_message_reads for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversation_members member
      where member.conversation_id = conversation_message_reads.conversation_id
        and member.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own conversation receipts" on public.conversation_message_reads;
create policy "Users can update own conversation receipts"
  on public.conversation_message_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversation_members member
      where member.conversation_id = conversation_message_reads.conversation_id
        and member.user_id = auth.uid()
    )
  );

-- beta-step: trip-confirmations
create table if not exists public.trip_confirmations (
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  confirmed_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index if not exists trip_confirmations_trip_id_idx
  on public.trip_confirmations (trip_id, confirmed_at desc);

alter table public.trip_confirmations enable row level security;

drop policy if exists "Trip members can read confirmations" on public.trip_confirmations;
create policy "Trip members can read confirmations"
  on public.trip_confirmations for select
  to authenticated
  using (
    exists (
      select 1 from public.trip_participants participant
      where participant.trip_id = trip_confirmations.trip_id
        and participant.user_id = auth.uid()
        and participant.status = 'active'
    )
  );

drop policy if exists "Trip members can confirm" on public.trip_confirmations;
create policy "Trip members can confirm"
  on public.trip_confirmations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.trip_participants participant
      where participant.trip_id = trip_confirmations.trip_id
        and participant.user_id = auth.uid()
        and participant.status = 'active'
    )
  );

drop policy if exists "Trip members can withdraw confirmation" on public.trip_confirmations;
create policy "Trip members can withdraw confirmation"
  on public.trip_confirmations for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.sync_trip_confirmation_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  trip_key text := coalesce(new.trip_id, old.trip_id);
  active_count integer;
  confirmed_count integer;
begin
  select count(*)::integer into active_count
  from public.trip_participants
  where trip_id = trip_key and status = 'active';

  select count(*)::integer into confirmed_count
  from public.trip_confirmations confirmation
  join public.trip_participants participant
    on participant.trip_id = confirmation.trip_id
   and participant.user_id = confirmation.user_id
   and participant.status = 'active'
  where confirmation.trip_id = trip_key;

  if active_count > 0 and confirmed_count = active_count then
    update public.trips
    set planning_status = 'confirmed', visibility = 'private', updated_at = now()
    where id = trip_key;
  elsif exists (select 1 from public.trips where id = trip_key and planning_status = 'confirmed') then
    update public.trips
    set planning_status = 'planned', visibility = 'public', updated_at = now()
    where id = trip_key;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_trip_confirmation_state_trigger on public.trip_confirmations;
create trigger sync_trip_confirmation_state_trigger
after insert or delete on public.trip_confirmations
for each row execute function public.sync_trip_confirmation_state();

-- beta-step: social-rpcs-and-notifications
create or replace function public.accept_trip_join_request(request_id uuid)
returns public.trip_join_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_request public.trip_join_requests;
begin
  update public.trip_join_requests
  set status = 'accepted', updated_at = now()
  where id = request_id
    and creator_id = auth.uid()
    and status = 'pending'
  returning * into updated_request;

  if updated_request.id is null then
    raise exception 'Demande introuvable ou déjà traitée.';
  end if;

  return updated_request;
end;
$$;

grant execute on function public.accept_trip_join_request(uuid) to authenticated;

create or replace function public.accept_trip_invitation(invitation_id uuid)
returns public.trip_invitations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  accepted_invitation public.trip_invitations;
begin
  update public.trip_invitations
  set status = 'accepted', updated_at = now()
  where id = invitation_id
    and invited_user_id = auth.uid()
    and status = 'pending'
  returning * into accepted_invitation;

  if accepted_invitation.id is null then
    raise exception 'Invitation introuvable ou déjà traitée.';
  end if;

  insert into public.trip_participants (trip_id, user_id, role, status)
  values (accepted_invitation.trip_id, auth.uid(), 'participant', 'active')
  on conflict (trip_id, user_id) do update
  set status = 'active', role = 'participant', updated_at = now();

  return accepted_invitation;
end;
$$;

grant execute on function public.accept_trip_invitation(uuid) to authenticated;

create or replace function public.leave_trip(trip_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.trips where id = trip_key and creator_id = auth.uid()
  ) then
    raise exception 'Le créateur doit supprimer le Trip ou le conserver.';
  end if;

  update public.trip_participants
  set status = 'left', updated_at = now()
  where trip_id = trip_key and user_id = auth.uid();

  update public.trip_interests
  set status = 'left', updated_at = now()
  where trip_id = trip_key and user_id = auth.uid();

  delete from public.trip_join_requests
  where trip_id = trip_key and requester_id = auth.uid();

  delete from public.trip_confirmations
  where trip_id = trip_key and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_trip(text) to authenticated;

create or replace function public.cleanup_expired_user_trips()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.trips
  where card_type = 'user_project'
    and end_date is not null
    and end_date < current_date;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_expired_user_trips() to authenticated, anon;

create or replace function public.notify_trip_conversation_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (
    user_id, type, title, body, related_trip_id, related_user_id
  )
  select
    member.user_id,
    'trip_message_received',
    'Nouveau message dans « ' || trip.title || ' »',
    left(coalesce(nullif(new.body, ''), 'Une photo a été envoyée.'), 180),
    conversation.trip_id,
    new.user_id
  from public.conversation_members member
  join public.conversations conversation on conversation.id = member.conversation_id
  join public.trips trip on trip.id = conversation.trip_id
  where member.conversation_id = new.conversation_id
    and member.user_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists notify_trip_conversation_message_trigger on public.conversation_messages;
create trigger notify_trip_conversation_message_trigger
after insert on public.conversation_messages
for each row execute function public.notify_trip_conversation_message();

-- beta-step: contact
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  subject text not null,
  body text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- beta-step: storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-media',
  'trip-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'conversation-media',
  'conversation-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload own trip media" on storage.objects;
create policy "Authenticated users can upload own trip media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Trip media is publicly readable" on storage.objects;
create policy "Trip media is publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'trip-media');

drop policy if exists "Users can remove own trip media" on storage.objects;
create policy "Users can remove own trip media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members can upload conversation media" on storage.objects;
create policy "Members can upload conversation media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'conversation-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      exists (
        select 1 from public.conversation_members member
        where member.conversation_id = (storage.foldername(name))[2]
          and member.user_id = auth.uid()
      )
      or exists (
        select 1 from public.tribe_connections connection
        where connection.id::text = (storage.foldername(name))[2]
          and connection.status = 'accepted'
          and (connection.requester_id = auth.uid() or connection.receiver_id = auth.uid())
      )
    )
  );

drop policy if exists "Members can read conversation media" on storage.objects;
create policy "Members can read conversation media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'conversation-media'
    and (
      exists (
        select 1 from public.conversation_members member
        where member.conversation_id = (storage.foldername(name))[2]
          and member.user_id = auth.uid()
      )
      or exists (
        select 1 from public.tribe_connections connection
        where connection.id::text = (storage.foldername(name))[2]
          and connection.status = 'accepted'
          and (connection.requester_id = auth.uid() or connection.receiver_id = auth.uid())
      )
    )
  );

drop policy if exists "Users can remove own conversation media" on storage.objects;
create policy "Users can remove own conversation media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'conversation-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
