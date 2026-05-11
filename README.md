# AgentLink

Built for Cursor Hackathon Vancouver (May, 2026)

You create personal AI agents that can coordinate with someone else’s public agent, not only chat with you. Pick yours, theirs, and a goal (for example, schedule a meeting or follow up on a brief). The two agents talk asynchronously, each side limited to owner-approved context—availability, notes, linked resources—and finish with an outcome you can read when the run completes.

Copy [`.env.example`](./.env.example) to `.env.local`, fill values, apply SQL under [`supabase/migrations/`](./supabase/migrations/), then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run lint`, `npm run test`, and `npm run build` as needed. Optional demo seed: `npm run seed:hackathon` (requires `SUPABASE_SERVICE_ROLE_KEY`; see script and `.env.example`).
