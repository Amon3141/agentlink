alter table public.resources
  drop constraint if exists resources_type_check;

alter table public.resources
  add constraint resources_type_check
  check (
    type in (
      'mock',
      'google_calendar',
      'availability_policy',
      'soft_hold_calendar',
      'sharing_rules',
      'project_brief'
    )
  );

alter table public.mcp_connections
  drop constraint if exists mcp_connections_provider_check;

alter table public.mcp_connections
  add constraint mcp_connections_provider_check
  check (provider in ('github', 'google_calendar', 'gmail', 'slack', 'internal'));

alter table public.mcp_tools
  drop constraint if exists mcp_tools_provider_check;

alter table public.mcp_tools
  add constraint mcp_tools_provider_check
  check (provider in ('github', 'google_calendar', 'gmail', 'slack', 'internal'));

alter table public.tool_call_audit
  drop constraint if exists tool_call_audit_provider_check;

alter table public.tool_call_audit
  add constraint tool_call_audit_provider_check
  check (provider in ('github', 'google_calendar', 'gmail', 'slack', 'internal'));

create table public.soft_holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'tentative' check (status in ('tentative', 'confirmed', 'cancelled')),
  created_by text not null default 'owner' check (created_by in ('owner', 'agent')),
  created_via_tool_id text,
  conversation_id uuid references public.conversations(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index soft_holds_user_start_idx
  on public.soft_holds(user_id, start_at);
create index soft_holds_resource_start_idx
  on public.soft_holds(resource_id, start_at);
create index soft_holds_conversation_idx
  on public.soft_holds(conversation_id)
  where conversation_id is not null;

create unique index mcp_connections_user_internal_unique
  on public.mcp_connections(user_id)
  where provider = 'internal';

alter table public.soft_holds enable row level security;

create policy "owners manage soft holds"
  on public.soft_holds for all
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.resources r
      where r.id = soft_holds.resource_id
        and r.user_id = auth.uid()
        and r.type = 'soft_hold_calendar'
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
    'internal.check_availability',
    'internal',
    'Check AgentLink soft-hold availability',
    'Check tentative and confirmed AgentLink soft holds for a requested time window.',
    '{"type":"object","properties":{"resourceId":{"type":"string"},"timeMin":{"type":"string"},"timeMax":{"type":"string"}},"required":["resourceId","timeMin","timeMax"]}'::jsonb,
    '{}'::text[],
    false
  ),
  (
    'internal.create_soft_hold',
    'internal',
    'Create AgentLink soft hold',
    'Create a tentative AgentLink calendar hold. Requires explicit write approval.',
    '{"type":"object","properties":{"resourceId":{"type":"string"},"title":{"type":"string"},"start":{"type":"string"},"end":{"type":"string"},"notes":{"type":"string"}},"required":["resourceId","title","start","end"]}'::jsonb,
    '{}'::text[],
    true
  ),
  (
    'internal.list_soft_holds',
    'internal',
    'List AgentLink soft holds',
    'List sanitized AgentLink soft holds in a requested time window.',
    '{"type":"object","properties":{"resourceId":{"type":"string"},"timeMin":{"type":"string"},"timeMax":{"type":"string"},"limit":{"type":"number"}},"required":["resourceId","timeMin","timeMax"]}'::jsonb,
    '{}'::text[],
    false
  )
on conflict (id) do update set
  provider = excluded.provider,
  name = excluded.name,
  description = excluded.description,
  input_schema = excluded.input_schema,
  default_scopes = excluded.default_scopes,
  is_write = excluded.is_write;
