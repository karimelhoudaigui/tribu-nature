create table if not exists public.tribe_message_reads (
  connection_id uuid not null references public.tribe_connections(id) on delete cascade,
  user_id uuid not null,
  last_read_at timestamptz not null default now(),
  primary key (connection_id, user_id)
);

create index if not exists tribe_message_reads_user_id_idx
  on public.tribe_message_reads (user_id, last_read_at desc);

alter table public.tribe_message_reads enable row level security;

drop policy if exists "Users can read own tribe message receipts" on public.tribe_message_reads;
create policy "Users can read own tribe message receipts"
  on public.tribe_message_reads for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own tribe message receipts" on public.tribe_message_reads;
create policy "Users can create own tribe message receipts"
  on public.tribe_message_reads for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tribe_connections tc
      where tc.id = tribe_message_reads.connection_id
        and tc.status = 'accepted'
        and (tc.requester_id = auth.uid() or tc.receiver_id = auth.uid())
    )
  );

drop policy if exists "Users can update own tribe message receipts" on public.tribe_message_reads;
create policy "Users can update own tribe message receipts"
  on public.tribe_message_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tribe_connections tc
      where tc.id = tribe_message_reads.connection_id
        and tc.status = 'accepted'
        and (tc.requester_id = auth.uid() or tc.receiver_id = auth.uid())
    )
  );
