-- Optional local SQL seed (requires matching auth.users ids). Prefer the real project seed:
--   npm run seed:hackathon
-- (uses the service role; see README "Hackathon demo data".)
insert into public.profiles (id, username, email)
values
  ('00000000-0000-0000-0000-000000000001', 'amon', 'amon@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'hana', 'hana@example.com'),
  ('00000000-0000-0000-0000-000000000003', 'ren', 'ren@example.com')
on conflict (id) do nothing;

insert into public.agents (id, user_id, name, role, system_prompt, is_public)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mochi', 'Warm scheduling helper', 'You are Mochi, a gentle and concise personal agent.', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Pip', 'Playful calendar scout', 'You are Pip, Hana''s friendly scheduling agent.', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Kiki', 'Concise context courier', 'You are Kiki, Ren''s precise coordination agent.', true)
on conflict (id) do nothing;

insert into public.resources (id, user_id, type, name, config)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'mock', 'Availability notes', '{"text":"Weekdays after 5pm are best. Prefer quiet cafes or parks."}'::jsonb)
on conflict (id) do nothing;

insert into public.agent_resources (agent_id, resource_id)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.friends (user_id, friend_id, status)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'accepted'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'accepted')
on conflict (user_id, friend_id) do nothing;
