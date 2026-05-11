-- At most one soft_hold_calendar resource per user (built-in calendar).

delete from public.resources r
using (
  select
    id,
    row_number() over (partition by user_id order by created_at asc) as rn
  from public.resources
  where type = 'soft_hold_calendar'
) d
where r.id = d.id
  and d.rn > 1;

create unique index if not exists resources_one_soft_hold_calendar_per_user
  on public.resources (user_id)
  where type = 'soft_hold_calendar';
