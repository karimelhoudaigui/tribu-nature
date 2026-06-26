create table if not exists public.tribe_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.tribe_connections(id) on delete cascade,
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists tribe_messages_connection_id_idx
  on public.tribe_messages (connection_id, created_at asc);

create index if not exists tribe_messages_sender_id_idx
  on public.tribe_messages (sender_id);

alter table public.tribe_messages enable row level security;

drop policy if exists "Tribe friends can read messages" on public.tribe_messages;
create policy "Tribe friends can read messages"
  on public.tribe_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.tribe_connections tc
      where tc.id = tribe_messages.connection_id
        and tc.status = 'accepted'
        and (tc.requester_id = auth.uid() or tc.receiver_id = auth.uid())
    )
  );

drop policy if exists "Tribe friends can send messages" on public.tribe_messages;
create policy "Tribe friends can send messages"
  on public.tribe_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.tribe_connections tc
      where tc.id = tribe_messages.connection_id
        and tc.status = 'accepted'
        and (tc.requester_id = auth.uid() or tc.receiver_id = auth.uid())
    )
  );

drop policy if exists "Users can edit own tribe messages" on public.tribe_messages;
create policy "Users can edit own tribe messages"
  on public.tribe_messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

drop policy if exists "Users can delete own tribe messages" on public.tribe_messages;
create policy "Users can delete own tribe messages"
  on public.tribe_messages for delete
  to authenticated
  using (sender_id = auth.uid());
