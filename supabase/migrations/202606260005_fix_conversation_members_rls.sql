drop policy if exists "Conversation members can read conversations" on public.conversations;
create policy "Authenticated users can read conversations"
  on public.conversations for select
  to authenticated
  using (true);

drop policy if exists "Conversation members can read members" on public.conversation_members;
create policy "Authenticated users can read conversation members"
  on public.conversation_members for select
  to authenticated
  using (true);
