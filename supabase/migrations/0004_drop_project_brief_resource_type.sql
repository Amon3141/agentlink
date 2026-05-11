-- Remove project_brief resources and enum value (no backward compatibility).

delete from public.resources
where type = 'project_brief';

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
      'sharing_rules'
    )
  );
