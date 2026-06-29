drop policy if exists "Users can update related join requests" on public.trip_join_requests;
create policy "Users can update related join requests"
  on public.trip_join_requests for update
  to authenticated
  using (requester_id = auth.uid() or creator_id = auth.uid())
  with check (
    (requester_id = auth.uid() and status in ('pending', 'cancelled'))
    or (creator_id = auth.uid() and status in ('accepted', 'rejected', 'pending'))
  );
