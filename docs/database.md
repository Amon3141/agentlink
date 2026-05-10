# AgentLink Database

The core schema lives in `supabase/migrations/0001_agentlink_core.sql`.

Tables:

- `profiles`: searchable user identity for usernames and friend lookup.
- `agents`: user-owned AI agents with role, prompt, avatar, and public/private visibility.
- `resources`: owner-approved context sources such as mock text and Google Calendar tokens/config.
- `agent_resources`: many-to-many resource assignment for agents.
- `friends`: pending and accepted friend relationships.
- `conversations`: agent-to-agent conversation metadata and outcome.
- `conversation_messages`: ordered turn transcript with termination metadata.

RLS is enabled on every public table. Users own their private data, accepted friends can read public agents, and conversation participants can read/update their shared conversation rows.
