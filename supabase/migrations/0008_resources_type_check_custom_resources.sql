-- Align resources_type_check with app expectations when older migrations were skipped.
-- Fixes: insert ... type = 'soft_hold_calendar' violates check constraint "resources_type_check"

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
