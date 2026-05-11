-- Initiator agents in a conversation may be private. Friends could not SELECT them
-- under "accepted friends read public agents" alone, so hydration showed placeholders.
-- Anyone who is initiator_id or friend_user_id on a conversation may read both agents.

create policy "participants read agents in their conversations"
  on public.agents for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where auth.uid() in (c.initiator_id, c.friend_user_id)
        and agents.id in (c.my_agent_id, c.friend_agent_id)
    )
  );
