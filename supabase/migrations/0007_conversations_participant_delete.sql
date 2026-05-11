-- Allow either participant to remove a conversation from their history (cascades messages).
create policy "participants delete conversations"
  on public.conversations for delete
  to authenticated
  using (auth.uid() = initiator_id or auth.uid() = friend_user_id);
