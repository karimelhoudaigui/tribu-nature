delete from public.profiles
where is_seed_profile = true;

update public.trips trip
set matched_member_ids = '{}',
    interested_count = (
      select count(*)::integer
      from public.trip_interests interest
      where interest.trip_id = trip.id
        and interest.status = 'interested'
    ),
    current_participants = (
      select count(*)::integer
      from public.trip_participants participant
      where participant.trip_id = trip.id
        and participant.status = 'active'
    ),
    updated_at = now();
