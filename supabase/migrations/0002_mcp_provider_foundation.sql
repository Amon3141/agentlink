create schema if not exists private;

create table public.mcp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('github', 'google_calendar', 'gmail', 'slack')),
  provider_account_id text,
  display_name text not null,
  status text not null default 'connected' check (status in ('connected', 'revoked', 'error')),
  scopes text[] not null default '{}'::text[],
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create table private.mcp_connection_secrets (
  connection_id uuid primary key references public.mcp_connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_payload jsonb not null,
  refresh_token text,
  token_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mcp_tools (
  id text primary key,
  provider text not null check (provider in ('github', 'google_calendar', 'gmail', 'slack')),
  name text not null,
  description text not null,
  input_schema jsonb not null default '{}'::jsonb,
  default_scopes text[] not null default '{}'::text[],
  is_write boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.agent_tool_permissions (
  agent_id uuid not null references public.agents(id) on delete cascade,
  connection_id uuid not null references public.mcp_connections(id) on delete cascade,
  tool_id text not null references public.mcp_tools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (agent_id, connection_id, tool_id)
);

create table public.tool_call_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  connection_id uuid references public.mcp_connections(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  provider text not null check (provider in ('github', 'google_calendar', 'gmail', 'slack')),
  tool_id text not null,
  inputs_summary jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  status text not null check (status in ('success', 'denied', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create index mcp_connections_user_provider_idx
  on public.mcp_connections(user_id, provider, status);
create index mcp_connections_status_idx
  on public.mcp_connections(status);
create index mcp_connection_secrets_user_id_idx
  on private.mcp_connection_secrets(user_id);
create index mcp_tools_provider_idx
  on public.mcp_tools(provider, is_write);
create index agent_tool_permissions_user_agent_idx
  on public.agent_tool_permissions(user_id, agent_id);
create index agent_tool_permissions_connection_idx
  on public.agent_tool_permissions(connection_id);
create index tool_call_audit_user_created_idx
  on public.tool_call_audit(user_id, created_at desc);
create index tool_call_audit_conversation_created_idx
  on public.tool_call_audit(conversation_id, created_at desc);
create index tool_call_audit_agent_created_idx
  on public.tool_call_audit(agent_id, created_at desc);

alter table public.mcp_connections enable row level security;
alter table private.mcp_connection_secrets enable row level security;
alter table public.mcp_tools enable row level security;
alter table public.agent_tool_permissions enable row level security;
alter table public.tool_call_audit enable row level security;

create policy "users read own mcp connections"
  on public.mcp_connections for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own mcp connections"
  on public.mcp_connections for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own mcp connections"
  on public.mcp_connections for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own mcp connections"
  on public.mcp_connections for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users read mcp tool catalog"
  on public.mcp_tools for select
  to authenticated
  using (true);

create policy "users read own agent tool permissions"
  on public.agent_tool_permissions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own agent tool permissions"
  on public.agent_tool_permissions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.agents a
      where a.id = agent_tool_permissions.agent_id
        and a.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.mcp_connections c
      join public.mcp_tools t on t.id = agent_tool_permissions.tool_id
      where c.id = agent_tool_permissions.connection_id
        and c.user_id = auth.uid()
        and c.status = 'connected'
        and t.provider = c.provider
    )
  );

create policy "users delete own agent tool permissions"
  on public.agent_tool_permissions for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "users read own tool audit"
  on public.tool_call_audit for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.conversations c
      where c.id = tool_call_audit.conversation_id
        and (c.initiator_id = auth.uid() or c.friend_user_id = auth.uid())
    )
  );

insert into public.mcp_tools (
  id,
  provider,
  name,
  description,
  input_schema,
  default_scopes,
  is_write
) values
  (
    'github.search_issues',
    'github',
    'Search GitHub issues and pull requests',
    'Search issues and pull requests in repositories the connected GitHub account can read.',
    '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"number"}},"required":["query"]}'::jsonb,
    array['repo'],
    false
  ),
  (
    'github.read_issue',
    'github',
    'Read a GitHub issue or pull request',
    'Read metadata and body text for a specific issue or pull request.',
    '{"type":"object","properties":{"owner":{"type":"string"},"repo":{"type":"string"},"number":{"type":"number"}},"required":["owner","repo","number"]}'::jsonb,
    array['repo'],
    false
  ),
  (
    'github.create_comment',
    'github',
    'Create a GitHub comment',
    'Create a comment on an issue or pull request. This is disabled by default and requires explicit write approval.',
    '{"type":"object","properties":{"owner":{"type":"string"},"repo":{"type":"string"},"number":{"type":"number"},"body":{"type":"string"}},"required":["owner","repo","number","body"]}'::jsonb,
    array['repo'],
    true
  ),
  (
    'google_calendar.list_events',
    'google_calendar',
    'Read Google Calendar events',
    'Read upcoming events from the primary calendar for availability checks.',
    '{"type":"object","properties":{"timeMin":{"type":"string"},"timeMax":{"type":"string"},"limit":{"type":"number"}}}'::jsonb,
    array['https://www.googleapis.com/auth/calendar.readonly'],
    false
  ),
  (
    'google_calendar.check_availability',
    'google_calendar',
    'Check Google Calendar availability',
    'Check whether the connected calendar appears busy in a requested time window.',
    '{"type":"object","properties":{"timeMin":{"type":"string"},"timeMax":{"type":"string"}},"required":["timeMin","timeMax"]}'::jsonb,
    array['https://www.googleapis.com/auth/calendar.readonly'],
    false
  ),
  (
    'google_calendar.create_tentative_event',
    'google_calendar',
    'Create tentative Google Calendar event',
    'Create a tentative calendar hold. Requires explicit write approval.',
    '{"type":"object","properties":{"summary":{"type":"string"},"start":{"type":"string"},"end":{"type":"string"},"description":{"type":"string"}},"required":["summary","start","end"]}'::jsonb,
    array['https://www.googleapis.com/auth/calendar.events'],
    true
  ),
  (
    'gmail.search_messages',
    'gmail',
    'Search Gmail message snippets',
    'Search Gmail and return limited metadata and snippets only.',
    '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"number"}},"required":["query"]}'::jsonb,
    array['https://www.googleapis.com/auth/gmail.readonly'],
    false
  ),
  (
    'gmail.create_draft',
    'gmail',
    'Create Gmail draft',
    'Create a draft email without sending it. Requires explicit write approval.',
    '{"type":"object","properties":{"to":{"type":"string"},"subject":{"type":"string"},"body":{"type":"string"}},"required":["to","subject","body"]}'::jsonb,
    array['https://www.googleapis.com/auth/gmail.compose'],
    true
  ),
  (
    'slack.search_messages',
    'slack',
    'Search Slack messages',
    'Search messages visible to the connected Slack account.',
    '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"number"}},"required":["query"]}'::jsonb,
    array['search:read'],
    false
  ),
  (
    'slack.post_message',
    'slack',
    'Post Slack message',
    'Post a Slack message. Requires explicit write approval.',
    '{"type":"object","properties":{"channel":{"type":"string"},"text":{"type":"string"}},"required":["channel","text"]}'::jsonb,
    array['chat:write'],
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  input_schema = excluded.input_schema,
  default_scopes = excluded.default_scopes,
  is_write = excluded.is_write;
