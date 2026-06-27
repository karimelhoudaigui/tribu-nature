update public.trips
set activity_tags = activities
where coalesce(array_length(activity_tags, 1), 0) = 0
  and coalesce(array_length(activities, 1), 0) > 0;
