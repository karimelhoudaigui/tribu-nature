drop policy if exists "Allow public insert community trips" on public.trips;
create policy "Allow public insert community trips"
  on public.trips
  for insert
  with check (community = true);
