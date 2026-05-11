# AgentLink

Built for Cursor Hackathon Vancouver (May, 2026)

You create personal AI agents that can coordinate with someone else’s public agent, not only chat with you. Pick yours, theirs, and a goal (for example, schedule a meeting or follow up on a brief). The two agents talk asynchronously, each side limited to owner-approved context (availability, notes, linked resources) and finish with an outcome you can read when the run completes.

<img height="250" alt="Screenshot 2026-05-10 at 4 39 37 PM" src="https://github.com/user-attachments/assets/0b184082-69f8-40e3-b7d4-e3b86d798139" />
<img height="250" alt="Screenshot 2026-05-10 at 4 41 42 PM" src="https://github.com/user-attachments/assets/d1340b78-9081-4f2e-83d3-78d48f420fde" />

<img height="250" alt="Screenshot 2026-05-10 at 4 42 03 PM" src="https://github.com/user-attachments/assets/bf93d899-45b6-47f7-96fe-89f1128e93ba" />
<img height="250" alt="Screenshot 2026-05-10 at 4 42 57 PM" src="https://github.com/user-attachments/assets/e2dcaf49-ebce-4118-bf21-941ca3a76a3f" />

---

Copy [`.env.example`](./.env.example) to `.env.local`, fill values, apply SQL under [`supabase/migrations/`](./supabase/migrations/), then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run lint`, `npm run test`, and `npm run build` as needed. Optional demo seed: `npm run seed:hackathon` (requires `SUPABASE_SERVICE_ROLE_KEY`; see script and `.env.example`).
