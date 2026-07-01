-- P0 trust, notification and account controls for the private beta.

alter table public.profiles
add column if not exists account_status text not null default 'active',
add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_status_check') then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'disabled', 'deleted'));
  end if;
end $$;

create table if not exists public.moderation_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_moderator(member_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.moderation_roles role
    where role.user_id = member_id
  );
$$;

revoke all on public.moderation_roles from anon, authenticated;
grant execute on function public.is_moderator(uuid) to authenticated;

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id, created_at desc);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;

create or replace function public.is_blocked_between(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null or (auth.uid() not in (first_user, second_user) and not public.is_moderator()) then false
    else exists (
      select 1 from public.user_blocks block
      where (block.blocker_id = first_user and block.blocked_id = second_user)
         or (block.blocker_id = second_user and block.blocked_id = first_user)
    )
  end;
$$;

grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

drop policy if exists "Users can read own blocks" on public.user_blocks;
create policy "Users can read own blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "Users can block from own account" on public.user_blocks;
create policy "Users can block from own account"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

drop policy if exists "Users can remove own blocks" on public.user_blocks;
create policy "Users can remove own blocks"
  on public.user_blocks for delete to authenticated
  using (blocker_id = auth.uid());

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'trip', 'message', 'conversation')),
  reason text not null check (reason in ('harassment', 'spam', 'fraud', 'unsafe', 'hate', 'inappropriate', 'other')),
  details text,
  reported_user_id uuid,
  reported_trip_id text,
  reported_message_id uuid,
  reported_conversation_id text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'action_taken')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (details is null or char_length(details) <= 2000),
  check (
    (target_type = 'user' and reported_user_id is not null)
    or (target_type = 'trip' and reported_trip_id is not null)
    or (target_type = 'message' and reported_message_id is not null)
    or (target_type = 'conversation' and reported_conversation_id is not null)
  )
);

create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id, created_at desc);
create index if not exists user_reports_status_idx on public.user_reports (status, created_at asc);
alter table public.user_reports enable row level security;

drop policy if exists "Users can create own reports" on public.user_reports;
create policy "Users can create own reports"
  on public.user_reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'pending');

drop policy if exists "Users and moderators can read reports" on public.user_reports;
create policy "Users and moderators can read reports"
  on public.user_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());

drop policy if exists "Moderators can update reports" on public.user_reports;
create policy "Moderators can update reports"
  on public.user_reports for update to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.user_reports(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;

drop policy if exists "Moderators can read moderation actions" on public.moderation_actions;
create policy "Moderators can read moderation actions"
  on public.moderation_actions for select to authenticated
  using (public.is_moderator());

drop policy if exists "Moderators can create moderation actions" on public.moderation_actions;
create policy "Moderators can create moderation actions"
  on public.moderation_actions for insert to authenticated
  with check (public.is_moderator() and moderator_id = auth.uid());

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.allow_profile_system_update', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.is_seed_profile := false;
      new.account_status := 'active';
      new.deleted_at := null;
    else
      new.verified := old.verified;
      new.is_seed_profile := old.is_seed_profile;
      new.account_status := old.account_status;
      new.deleted_at := old.deleted_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_system_fields_trigger on public.profiles;
create trigger protect_profile_system_fields_trigger
before insert or update on public.profiles
for each row execute function public.protect_profile_system_fields();

update public.profiles
set verified = false,
    badges = array_remove(badges, 'profil connecté')
where is_seed_profile = false;

create or replace view public.public_profiles
with (security_invoker = false, security_barrier = true)
as
select
  profile.id,
  profile.display_name,
  profile.avatar_url,
  profile.avatar_path,
  profile.city,
  profile.bio,
  profile.age_range,
  profile.verified,
  profile.physical_level,
  profile.budget_range,
  profile.adventure_style,
  profile.preferred_ambiences,
  profile.safety_preferences,
  profile.past_trips,
  profile.badges,
  profile.is_seed_profile,
  profile.last_seen_at,
  profile.preferred_language,
  profile.created_at,
  profile.updated_at
from public.profiles profile
where profile.account_status = 'active'
  and (
    auth.uid() is null
    or profile.id = auth.uid()
    or not public.is_blocked_between(profile.id, auth.uid())
  );

grant select on public.public_profiles to authenticated;

create or replace function public.cancel_connection_after_block()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.tribe_connections
  set status = 'cancelled', updated_at = now()
  where status in ('pending', 'accepted')
    and (
      (requester_id = new.blocker_id and receiver_id = new.blocked_id)
      or (requester_id = new.blocked_id and receiver_id = new.blocker_id)
    );
  return new;
end;
$$;

drop trigger if exists cancel_connection_after_block_trigger on public.user_blocks;
create trigger cancel_connection_after_block_trigger
after insert on public.user_blocks
for each row execute function public.cancel_connection_after_block();

drop policy if exists "Users can send tribe requests" on public.tribe_connections;
create policy "Users can send tribe requests"
  on public.tribe_connections for insert to authenticated
  with check (
    requester_id = auth.uid()
    and requester_id <> receiver_id
    and not public.is_blocked_between(requester_id, receiver_id)
  );

drop policy if exists "Tribe friends can send messages" on public.tribe_messages;
create policy "Tribe friends can send messages"
  on public.tribe_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.tribe_connections connection
      where connection.id = tribe_messages.connection_id
        and connection.status = 'accepted'
        and (connection.requester_id = auth.uid() or connection.receiver_id = auth.uid())
        and not public.is_blocked_between(connection.requester_id, connection.receiver_id)
    )
  );

drop policy if exists "Users can invite to favorite trips" on public.trip_invitations;
create policy "Users can invite to favorite trips"
  on public.trip_invitations for insert to authenticated
  with check (
    inviter_id = auth.uid()
    and inviter_id <> invited_user_id
    and not public.is_blocked_between(inviter_id, invited_user_id)
  );

-- Notifications are generated by trusted database events only.
drop policy if exists "Authenticated users can create notifications" on public.notifications;
revoke insert on public.notifications from anon, authenticated;

create or replace function public.protect_notification_content()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.user_id then
    new.id := old.id;
    new.user_id := old.user_id;
    new.type := old.type;
    new.title := old.title;
    new.body := old.body;
    new.related_trip_id := old.related_trip_id;
    new.related_user_id := old.related_user_id;
    new.related_request_id := old.related_request_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_notification_content_trigger on public.notifications;
create trigger protect_notification_content_trigger
before update on public.notifications
for each row execute function public.protect_notification_content();

delete from public.notifications duplicate
using public.notifications original
where duplicate.user_id = original.user_id
  and duplicate.type = original.type
  and duplicate.related_request_id = original.related_request_id
  and duplicate.related_request_id is not null
  and (duplicate.created_at > original.created_at or (duplicate.created_at = original.created_at and duplicate.id > original.id));

create unique index if not exists notifications_event_once_idx
  on public.notifications (user_id, type, related_request_id)
  where related_request_id is not null;

create or replace function public.actor_display_name(actor_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select display_name from public.profiles where id = actor_id), 'Un membre');
$$;

create or replace function public.notify_join_request_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare trip_title text;
begin
  select title into trip_title from public.trips where id = new.trip_id;
  if tg_op = 'INSERT' or (old.status is distinct from new.status and new.status = 'pending') then
    insert into public.notifications (user_id, type, title, body, related_trip_id, related_user_id, related_request_id)
    values (new.creator_id, 'join_request_received', public.actor_display_name(new.requester_id) || ' souhaite rejoindre ton Trip', public.actor_display_name(new.requester_id) || ' souhaite rejoindre « ' || coalesce(trip_title, 'ce Trip') || ' ».', new.trip_id, new.requester_id, new.id)
    on conflict do nothing;
  elsif old.status is distinct from new.status and new.status in ('accepted', 'rejected') then
    insert into public.notifications (user_id, type, title, body, related_trip_id, related_user_id, related_request_id)
    values (new.requester_id, case when new.status = 'accepted' then 'join_request_accepted' else 'join_request_rejected' end, case when new.status = 'accepted' then 'Ta demande a été acceptée' else 'Ta demande n’a pas été retenue' end, 'Réponse pour « ' || coalesce(trip_title, 'ce Trip') || ' ».', new.trip_id, new.creator_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_join_request_change_trigger on public.trip_join_requests;
create trigger notify_join_request_change_trigger
after insert or update of status on public.trip_join_requests
for each row execute function public.notify_join_request_change();

create or replace function public.notify_trip_invitation_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare trip_title text;
begin
  select title into trip_title from public.trips where id = new.trip_id;
  if tg_op = 'INSERT' or (old.status is distinct from new.status and new.status = 'pending') then
    insert into public.notifications (user_id, type, title, body, related_trip_id, related_user_id, related_request_id)
    values (new.invited_user_id, 'trip_invitation_received', public.actor_display_name(new.inviter_id) || ' t’invite à rejoindre un Trip', 'Invitation pour « ' || coalesce(trip_title, 'ce Trip') || ' ».', new.trip_id, new.inviter_id, new.id)
    on conflict do nothing;
  elsif old.status is distinct from new.status and new.status in ('accepted', 'rejected') then
    insert into public.notifications (user_id, type, title, body, related_trip_id, related_user_id, related_request_id)
    values (new.inviter_id, case when new.status = 'accepted' then 'trip_invitation_accepted' else 'trip_invitation_rejected' end, case when new.status = 'accepted' then public.actor_display_name(new.invited_user_id) || ' a accepté ton invitation' else public.actor_display_name(new.invited_user_id) || ' a refusé ton invitation' end, 'Réponse pour « ' || coalesce(trip_title, 'ce Trip') || ' ».', new.trip_id, new.invited_user_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_trip_invitation_change_trigger on public.trip_invitations;
create trigger notify_trip_invitation_change_trigger
after insert or update of status on public.trip_invitations
for each row execute function public.notify_trip_invitation_change();

create or replace function public.notify_tribe_connection_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or (old.status is distinct from new.status and new.status = 'pending') then
    insert into public.notifications (user_id, type, title, body, related_user_id, related_request_id)
    values (new.receiver_id, 'friend_request_received', public.actor_display_name(new.requester_id) || ' souhaite t’ajouter à sa tribu', 'Tu peux accepter ou refuser cette demande depuis ton espace Tribu.', new.requester_id, new.id)
    on conflict do nothing;
  elsif old.status is distinct from new.status and new.status in ('accepted', 'rejected') then
    insert into public.notifications (user_id, type, title, body, related_user_id, related_request_id)
    values (new.requester_id, case when new.status = 'accepted' then 'friend_request_accepted' else 'friend_request_rejected' end, case when new.status = 'accepted' then public.actor_display_name(new.receiver_id) || ' a accepté ta demande' else public.actor_display_name(new.receiver_id) || ' a refusé ta demande' end, null, new.receiver_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_tribe_connection_change_trigger on public.tribe_connections;
create trigger notify_tribe_connection_change_trigger
after insert or update of status on public.tribe_connections
for each row execute function public.notify_tribe_connection_change();

create or replace function public.notify_private_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare recipient_id uuid;
begin
  select case when requester_id = new.sender_id then receiver_id else requester_id end
  into recipient_id
  from public.tribe_connections
  where id = new.connection_id and status = 'accepted';

  if recipient_id is not null and not public.is_blocked_between(new.sender_id, recipient_id) then
    insert into public.notifications (user_id, type, title, body, related_user_id)
    values (recipient_id, 'private_message_received', 'Nouveau message de ' || public.actor_display_name(new.sender_id), left(coalesce(nullif(new.body, ''), 'Une photo a été envoyée.'), 180), new.sender_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_private_message_trigger on public.tribe_messages;
create trigger notify_private_message_trigger
after insert on public.tribe_messages
for each row execute function public.notify_private_message();

create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(profile) from public.profiles profile where profile.id = auth.uid()),
    'travel_preferences', (select to_jsonb(preference) from public.travel_preferences preference where preference.user_id = auth.uid()),
    'trips_created', coalesce((select jsonb_agg(to_jsonb(trip)) from public.trips trip where trip.creator_id = auth.uid()), '[]'::jsonb),
    'favorites', coalesce((select jsonb_agg(to_jsonb(favorite)) from public.trip_favorites favorite where favorite.user_id = auth.uid()), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(report)) from public.user_reports report where report.reporter_id = auth.uid()), '[]'::jsonb)
  );
$$;

revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;

create or replace function public.deactivate_my_account()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare deactivated_at timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform set_config('app.allow_profile_system_update', 'on', true);

  update public.trips
  set visibility = 'private', planning_status = 'cancelled', updated_at = deactivated_at
  where creator_id = auth.uid() and card_type = 'user_project';

  update public.trip_participants set status = 'left', updated_at = deactivated_at where user_id = auth.uid();
  update public.trip_interests set status = 'left', updated_at = deactivated_at where user_id = auth.uid();
  update public.tribe_connections set status = 'cancelled', updated_at = deactivated_at where requester_id = auth.uid() or receiver_id = auth.uid();
  delete from public.conversation_members where user_id = auth.uid();
  delete from public.trip_favorites where user_id = auth.uid();
  delete from public.travel_preferences where user_id = auth.uid();

  update public.profiles
  set email = null,
      display_name = 'Utilisateur supprimé',
      avatar_url = null,
      avatar_path = null,
      city = null,
      bio = null,
      age_range = null,
      physical_level = null,
      budget_range = null,
      adventure_style = null,
      preferred_ambiences = '{}',
      safety_preferences = '{}',
      badges = '{}',
      last_seen_at = null,
      verified = false,
      account_status = 'deleted',
      deleted_at = deactivated_at,
      updated_at = deactivated_at
  where id = auth.uid();

  return deactivated_at;
end;
$$;

revoke all on function public.deactivate_my_account() from public;
grant execute on function public.deactivate_my_account() to authenticated;
