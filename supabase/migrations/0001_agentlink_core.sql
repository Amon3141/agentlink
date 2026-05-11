create extension if not exists "pgcrypto";

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  role text not null,
  system_prompt text not null,
  avatar_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('mock', 'google_calendar')),
  name text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.agent_resources (
  agent_id uuid not null references public.agents(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  primary key (agent_id, resource_id)
);

create table private.google_calendar_tokens (
  resource_id uuid primary key references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  initiator_id uuid not null references public.profiles(id) on delete cascade,
  my_agent_id uuid not null references public.agents(id) on delete restrict,
  friend_agent_id uuid not null references public.agents(id) on delete restrict,
  friend_user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null,
  status text not null default 'ongoing' check (status in ('ongoing', 'completed', 'failed')),
  outcome jsonb,
  created_at timestamptz not null default now()
);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_agent_id uuid not null references public.agents(id) on delete restrict,
  content text not null,
  is_termination boolean not null default false,
  termination_reason text,
  turn_number integer not null check (turn_number > 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  unique (conversation_id, turn_number)
);

create index agents_user_id_idx on public.agents(user_id);
create index agents_public_idx on public.agents(user_id, is_public);
create index resources_user_id_idx on public.resources(user_id);
create index agent_resources_resource_id_idx on public.agent_resources(resource_id);
create index google_calendar_tokens_user_id_idx on private.google_calendar_tokens(user_id);
create index friends_user_status_idx on public.friends(user_id, status);
create index friends_friend_status_idx on public.friends(friend_id, status);
create index conversations_participants_idx on public.conversations(initiator_id, friend_user_id, status);
create index conversations_agents_idx on public.conversations(my_agent_id, friend_agent_id);
create index conversations_friend_agent_id_idx on public.conversations(friend_agent_id);
create index conversations_friend_user_id_idx on public.conversations(friend_user_id);
create index conversation_messages_conversation_turn_idx on public.conversation_messages(conversation_id, turn_number);
create index conversation_messages_sender_agent_id_idx on public.conversation_messages(sender_agent_id);
create index conversation_messages_pending_idx on public.conversation_messages(conversation_id, status)
  where status = 'pending';

alter table private.google_calendar_tokens enable row level security;
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.resources enable row level security;
alter table public.agent_resources enable row level security;
alter table public.friends enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

create or replace function private.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.friends f
    where f.status = 'accepted'
      and (
        (f.user_id = user_a and f.friend_id = user_b)
        or (f.user_id = user_b and f.friend_id = user_a)
      )
  );
$$;

create policy "profiles are searchable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "owners manage agents"
  on public.agents for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "accepted friends read public agents"
  on public.agents for select
  to authenticated
  using (
    is_public
    and private.are_friends(auth.uid(), agents.user_id)
  );

create policy "owners manage resources"
  on public.resources for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owners manage agent resources"
  on public.agent_resources for all
  to authenticated
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_resources.agent_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.agents a
      join public.resources r on r.id = agent_resources.resource_id
      where a.id = agent_resources.agent_id
        and a.user_id = auth.uid()
        and r.user_id = auth.uid()
    )
  );

create policy "users see their friend rows"
  on public.friends for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "users create outgoing friend requests"
  on public.friends for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "recipients accept pending requests"
  on public.friends for update
  to authenticated
  using (auth.uid() = friend_id and status = 'pending')
  with check (auth.uid() = friend_id and status = 'accepted');

create policy "participants delete friend rows"
  on public.friends for delete
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "participants read conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = initiator_id or auth.uid() = friend_user_id);

create policy "initiators create valid conversations"
  on public.conversations for insert
  to authenticated
  with check (
    auth.uid() = initiator_id
    and exists (
      select 1 from public.agents a
      where a.id = my_agent_id
        and a.user_id = auth.uid()
    )
    and exists (
      select 1 from public.agents a
      where a.id = friend_agent_id
        and a.user_id = friend_user_id
        and a.is_public = true
    )
    and private.are_friends(auth.uid(), friend_user_id)
  );

create policy "participants update conversations"
  on public.conversations for update
  to authenticated
  using (auth.uid() = initiator_id or auth.uid() = friend_user_id)
  with check (auth.uid() = initiator_id or auth.uid() = friend_user_id);

create policy "participants read messages"
  on public.conversation_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
        and (c.initiator_id = auth.uid() or c.friend_user_id = auth.uid())
    )
  );

create policy "participants create pending conversation turns"
  on public.conversation_messages for insert
  to authenticated
  with check (
    status = 'pending'
    and content = 'Agent is thinking...'
    and is_termination = false
    and termination_reason is null
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
        and c.status = 'ongoing'
        and (c.initiator_id = auth.uid() or c.friend_user_id = auth.uid())
        and conversation_messages.sender_agent_id in (c.my_agent_id, c.friend_agent_id)
    )
  );

create policy "participants update pending conversation turns"
  on public.conversation_messages for update
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
        and c.status = 'ongoing'
        and (c.initiator_id = auth.uid() or c.friend_user_id = auth.uid())
    )
  )
  with check (
    status in ('completed', 'failed')
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
        and (c.initiator_id = auth.uid() or c.friend_user_id = auth.uid())
    )
  );

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user'),
    '[^a-z0-9_]+',
    '_',
    'g'
  ));
  base_username := trim(both '_' from base_username);

  if base_username = '' then
    base_username := 'user';
  end if;

  final_username := base_username;

  if exists (select 1 from public.profiles where username = final_username) then
    final_username := base_username || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, username, email, avatar_url)
  values (
    new.id,
    final_username,
    lower(new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

create or replace function public.claim_next_conversation_turn(p_conversation_id uuid)
returns table (
  status text,
  message_id uuid,
  turn_number integer,
  sender_agent_id uuid
)
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  convo public.conversations%rowtype;
  pending public.conversation_messages%rowtype;
  completed_turns integer;
  next_sender uuid;
begin
  select *
  into convo
  from public.conversations
  where id = p_conversation_id
  for update;

  if not found or (convo.initiator_id <> auth.uid() and convo.friend_user_id <> auth.uid()) then
    status := 'missing';
    message_id := null;
    turn_number := null;
    sender_agent_id := null;
    return next;
  end if;

  if convo.status <> 'ongoing' then
    status := convo.status;
    message_id := null;
    turn_number := null;
    sender_agent_id := null;
    return next;
  end if;

  select *
  into pending
  from public.conversation_messages m
  where m.conversation_id = p_conversation_id
    and m.status = 'pending'
  order by m.turn_number
  limit 1;

  if found then
    status := 'in_progress';
    message_id := pending.id;
    turn_number := pending.turn_number;
    sender_agent_id := pending.sender_agent_id;
    return next;
  end if;

  select count(*)
  into completed_turns
  from public.conversation_messages m
  where m.conversation_id = p_conversation_id
    and m.status = 'completed';

  if completed_turns % 2 = 0 then
    next_sender := convo.my_agent_id;
  else
    next_sender := convo.friend_agent_id;
  end if;

  insert into public.conversation_messages (
    conversation_id,
    sender_agent_id,
    content,
    is_termination,
    termination_reason,
    turn_number,
    status
  )
  values (
    p_conversation_id,
    next_sender,
    'Agent is thinking...',
    false,
    null,
    completed_turns + 1,
    'pending'
  )
  returning * into pending;

  status := 'claimed';
  message_id := pending.id;
  turn_number := pending.turn_number;
  sender_agent_id := pending.sender_agent_id;
  return next;
end;
$$;

create or replace function public.complete_conversation_turn(
  p_message_id uuid,
  p_content text,
  p_is_termination boolean,
  p_termination_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  message_row public.conversation_messages%rowtype;
  convo public.conversations%rowtype;
begin
  if p_content is null or length(trim(p_content)) = 0 then
    return false;
  end if;

  select *
  into message_row
  from public.conversation_messages
  where id = p_message_id
    and status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  select *
  into convo
  from public.conversations
  where id = message_row.conversation_id
  for update;

  if not found or convo.status <> 'ongoing' or (convo.initiator_id <> auth.uid() and convo.friend_user_id <> auth.uid()) then
    return false;
  end if;

  update public.conversation_messages
  set
    content = p_content,
    is_termination = p_is_termination,
    termination_reason = nullif(p_termination_reason, ''),
    status = 'completed'
  where id = p_message_id;

  if p_is_termination then
    update public.conversations
    set
      status = 'completed',
      outcome = jsonb_build_object(
        'summary', p_content,
        'reason', nullif(p_termination_reason, ''),
        'completedByAgentId', message_row.sender_agent_id
      )
    where id = message_row.conversation_id;
  end if;

  return true;
end;
$$;

create or replace function public.fail_conversation_turn(
  p_message_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  message_row public.conversation_messages%rowtype;
  convo public.conversations%rowtype;
begin
  select *
  into message_row
  from public.conversation_messages
  where id = p_message_id
    and status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  select *
  into convo
  from public.conversations
  where id = message_row.conversation_id
  for update;

  if not found or (convo.initiator_id <> auth.uid() and convo.friend_user_id <> auth.uid()) then
    return false;
  end if;

  update public.conversation_messages
  set
    content = coalesce(nullif(p_reason, ''), 'The agent turn failed before a response could be saved.'),
    termination_reason = coalesce(nullif(p_reason, ''), 'Turn failed.'),
    status = 'failed'
  where id = p_message_id;

  update public.conversations
  set
    status = 'failed',
    outcome = jsonb_build_object(
      'summary', 'The conversation failed while asking an agent to respond.',
      'reason', coalesce(nullif(p_reason, ''), 'Turn failed.')
    )
  where id = message_row.conversation_id
    and status = 'ongoing';

  return true;
end;
$$;
