-- Demo-friendly labels (calendar / plan wording) for AgentLink first-party tools.

update public.mcp_tools
set
  name = 'Check AgentLink calendar availability',
  description = 'Check tentative and confirmed calendar plans for a requested time window.'
where id = 'internal.check_availability';

update public.mcp_tools
set
  name = 'Create AgentLink calendar plan',
  description = 'Create a tentative plan on an owner-approved AgentLink calendar.'
where id = 'internal.create_soft_hold';

update public.mcp_tools
set
  name = 'List AgentLink calendar plans',
  description = 'List sanitized AgentLink plans in a requested time window.'
where id = 'internal.list_soft_holds';
