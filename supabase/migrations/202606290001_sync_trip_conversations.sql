create or replace function public.sync_trip_participant_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card_type text;
  v_conversation_type text;
  v_conversation_id text;
begin
  select card_type
  into v_card_type
  from public.trips
  where id = new.trip_id;

  if v_card_type is null then
    return new;
  end if;

  v_conversation_type := case when v_card_type = 'catalog' then 'catalog_interest' else 'user_project' end;
  v_conversation_id := v_conversation_type || '-' || new.trip_id;

  if new.status = 'active' then
    insert into public.conversations (id, trip_id, conversation_type)
    values (v_conversation_id, new.trip_id, v_conversation_type)
    on conflict (id) do update
    set trip_id = excluded.trip_id,
        conversation_type = excluded.conversation_type;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, new.user_id)
    on conflict (conversation_id, user_id) do nothing;
  else
    delete from public.conversation_members
    where conversation_id = v_conversation_id
      and user_id = new.user_id;
  end if;

  update public.trips
  set conversation_id = v_conversation_id,
      current_participants = (
        select count(*)::integer
        from public.trip_participants participant
        where participant.trip_id = new.trip_id
          and participant.status = 'active'
      ),
      updated_at = now()
  where id = new.trip_id;

  return new;
end;
$$;

drop trigger if exists sync_trip_participant_conversation_trigger on public.trip_participants;
create trigger sync_trip_participant_conversation_trigger
after insert or update of status, role on public.trip_participants
for each row execute function public.sync_trip_participant_conversation();

create or replace function public.initialize_user_project_social_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.card_type = 'user_project' and new.creator_id is not null then
    insert into public.trip_participants (trip_id, user_id, role, status)
    values (new.id, new.creator_id, 'creator', 'active')
    on conflict (trip_id, user_id) do update
    set role = 'creator',
        status = 'active',
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists initialize_user_project_social_state_trigger on public.trips;
create trigger initialize_user_project_social_state_trigger
after insert on public.trips
for each row execute function public.initialize_user_project_social_state();

create or replace function public.sync_accepted_trip_join_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'accepted' then
    insert into public.trip_participants (trip_id, user_id, role, status)
    values (new.trip_id, new.requester_id, 'participant', 'active')
    on conflict (trip_id, user_id) do update
    set role = 'participant',
        status = 'active',
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists sync_accepted_trip_join_request_trigger on public.trip_join_requests;
create trigger sync_accepted_trip_join_request_trigger
after insert or update of status on public.trip_join_requests
for each row execute function public.sync_accepted_trip_join_request();

create or replace function public.sync_catalog_trip_interest()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'interested' then
    insert into public.trip_participants (trip_id, user_id, role, status)
    values (new.trip_id, new.user_id, 'participant', 'active')
    on conflict (trip_id, user_id) do update
    set role = 'participant',
        status = 'active',
        updated_at = now();
  else
    update public.trip_participants
    set status = 'left',
        updated_at = now()
    where trip_id = new.trip_id
      and user_id = new.user_id
      and role = 'participant';
  end if;

  update public.trips
  set interested_count = (
        select count(*)::integer
        from public.trip_interests interest
        where interest.trip_id = new.trip_id
          and interest.status = 'interested'
      ),
      updated_at = now()
  where id = new.trip_id;

  return new;
end;
$$;

drop trigger if exists sync_catalog_trip_interest_trigger on public.trip_interests;
create trigger sync_catalog_trip_interest_trigger
after insert or update of status on public.trip_interests
for each row execute function public.sync_catalog_trip_interest();

insert into public.trip_participants (trip_id, user_id, role, status)
select trip.id, trip.creator_id, 'creator', 'active'
from public.trips trip
where trip.card_type = 'user_project'
  and trip.creator_id is not null
on conflict (trip_id, user_id) do update
set role = 'creator',
    status = 'active',
    updated_at = now();

insert into public.trip_participants (trip_id, user_id, role, status)
select request.trip_id, request.requester_id, 'participant', 'active'
from public.trip_join_requests request
where request.status = 'accepted'
on conflict (trip_id, user_id) do update
set role = 'participant',
    status = 'active',
    updated_at = now();

insert into public.trip_participants (trip_id, user_id, role, status)
select interest.trip_id, interest.user_id, 'participant', 'active'
from public.trip_interests interest
where interest.status = 'interested'
on conflict (trip_id, user_id) do update
set role = 'participant',
    status = 'active',
    updated_at = now();
