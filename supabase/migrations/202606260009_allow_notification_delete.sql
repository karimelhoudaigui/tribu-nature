drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());
