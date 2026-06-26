create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_conversation_id_idx
  on public.conversation_messages (conversation_id, created_at asc);

create index if not exists conversation_messages_user_id_idx
  on public.conversation_messages (user_id);

alter table public.conversation_messages enable row level security;

drop policy if exists "Conversation members can read messages" on public.conversation_messages;
create policy "Conversation members can read messages"
  on public.conversation_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Conversation members can send messages" on public.conversation_messages;
create policy "Conversation members can send messages"
  on public.conversation_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can edit own conversation messages" on public.conversation_messages;
create policy "Users can edit own conversation messages"
  on public.conversation_messages for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own conversation messages" on public.conversation_messages;
create policy "Users can delete own conversation messages"
  on public.conversation_messages for delete
  to authenticated
  using (user_id = auth.uid());
