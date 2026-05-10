# AgentLink

AgentLink is a warm, sketchbook-style Next.js 15 MVP where personal AI agents coordinate with friends' public agents using owner-approved context.

## Stack

- Next.js 15 App Router, React Server Components, and Server Actions
- Supabase Auth, Postgres, and RLS-backed data access
- Tailwind CSS v4 with shadcn/base-ui components
- Clod-only LLM service abstraction in `lib/clod.ts`

## Environment

Copy `.env.example` to `.env.local` and fill in real values:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLOD_ENDPOINT=https://api.clod.io/v1
CLOD_API_KEY=your-clod-api-key
CLOD_MODEL=DeepSeek V3
```

Optional provider OAuth variables:

```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/api/resources/github/callback

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/resources/google-calendar/callback
GOOGLE_REDIRECT_URI=http://localhost:3000/api/resources/google-calendar/callback
GMAIL_REDIRECT_URI=http://localhost:3000/api/resources/gmail/callback

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:3000/api/resources/slack/callback
```

When Supabase env vars are present, app routes require a real authenticated Supabase session. Without Supabase env vars, the app keeps a local demo mode for UI exploration. In production, `CLOD_ENDPOINT` is required.

## Supabase Setup

Apply `supabase/migrations/0001_agentlink_core.sql` to the Supabase project. The migration creates:

- `profiles`, `agents`, `resources`, `agent_resources`, `friends`, `conversations`, and `conversation_messages`
- private `google_calendar_tokens` storage for future server-side calendar token handling
- RLS policies for ownership, accepted-friend public agent visibility, valid conversation creation, and participant-only conversation access
- profile bootstrap trigger on `auth.users`
- RPC helpers for idempotent conversation turn claiming/completion/failure

Apply `supabase/migrations/0002_mcp_provider_foundation.sql` after the core migration to add MCP-style provider tables:

- `mcp_connections`, `mcp_tools`, `agent_tool_permissions`, and `tool_call_audit`
- private `mcp_connection_secrets` token storage
- RLS policies for user-owned connection metadata, agent-scoped tool grants, and participant-visible audit rows
- seeded MVP tools for GitHub, Google Calendar, Gmail, and Slack

Apply `supabase/migrations/0003_custom_resources_soft_holds.sql` after the provider foundation to add first-party scheduling resources:

- `availability_policy`, `soft_hold_calendar`, `sharing_rules`, and `project_brief` resource types
- `soft_holds` with owner-only RLS and FK checks back to owner-owned soft-hold calendar resources
- an `internal` provider with AgentLink tools for checking soft-hold availability and creating tentative holds

After applying the migration, verify the Supabase Dashboard Auth URL settings include:

- Site URL matching `NEXT_PUBLIC_SITE_URL`
- Redirect URL: `${NEXT_PUBLIC_SITE_URL}/auth/callback`

Magic-link sign-in creates a profile automatically through the trigger. Users can then search friends by exact email or username.

### Hackathon demo data

With `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, run:

```bash
npm run seed:hackathon
```

This creates demo auth users (`hana_demo`, `ren_demo`, `maya_demo` at `@agentlink.invalid`), friends rows, agents, resources, and a sample conversation for the **primary** profile (`amon_kizawa` / `amon_kizwa`, or `HACKATHON_OWNER_*`). It also seeds a **partner** profile (`kizawaamon@gmail.com` / username `kizawaamon`, or `HACKATHON_PARTNER_*`) with its own agents and resources, and an **accepted friend link** between the two when both exist.

Optional MCP and soft-hold rows are skipped if migrations `0002` / `0003` are not applied yet.

## Provider OAuth Setup

Register callback URLs in each provider dashboard:

```text
${NEXT_PUBLIC_SITE_URL}/api/resources/github/callback
${NEXT_PUBLIC_SITE_URL}/api/resources/google-calendar/callback
${NEXT_PUBLIC_SITE_URL}/api/resources/gmail/callback
${NEXT_PUBLIC_SITE_URL}/api/resources/slack/callback
```

Recommended MVP scopes:

- GitHub: `repo`
- Google Calendar: `openid email profile https://www.googleapis.com/auth/calendar.readonly`
- Gmail: `openid email profile https://www.googleapis.com/auth/gmail.readonly`
- Slack: `search:read`

Write tools such as GitHub comments, tentative calendar events, Gmail drafts, and Slack posts remain agent-permission gated and should only be enabled with matching write scopes. OAuth tokens and refresh tokens are stored server-side in the private schema and are never sent to the browser or Clod prompts.

## First-Party Scheduling Resources

AgentLink includes custom owner-defined resources so the core scheduling story works without external OAuth:

- **Availability Policy** captures preferred days/times, default meeting duration, buffer time, focus blocks, work/social preferences, and freeform notes. Agents receive a concise policy summary instead of raw calendar details.
- **Soft Hold Calendar** is an internal AgentLink calendar for tentative holds. It is separate from Google Calendar and never pretends to be Google availability when a provider call fails.
- **Sharing Rules** and **Project Brief** provide lightweight structured context for privacy boundaries and project framing.

Agents can only use a soft-hold calendar when the owner attaches that resource to the agent and grants the matching `internal.*` tool permission. Clod may request a structured tool intent, but only the server validates ownership, agent attachment, tool permission, and input shape before creating a hold. Tool results and audit rows are sanitized; OAuth tokens, refresh tokens, provider credentials, email bodies, Slack raw logs, and private calendar details are never sent to the browser or Clod.

In the Mina/Ken story, Mochi can summarize: “Mina appears available Tuesday 6:00-6:30pm,” based on an attached availability policy and soft-hold calendar. If `internal.create_soft_hold` is approved, the server creates a tentative AgentLink hold and writes `tool_call_audit`; otherwise Mochi can recommend the time without mutating data.

## Run

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Product Notes

- Friends support outgoing requests, incoming accept/reject, cancellation, accepted lists, and accepted-friend public agent discovery.
- Agents can be created, edited, deleted, tested through Clod, and assigned owner-owned resources.
- Mock resources and first-party scheduling resources are fully functional. Google Calendar stays in a clear not-configured state unless OAuth credentials are supplied.
- Conversation polling is single-flight on the client, while Supabase RPC turn claims prevent duplicate Clod calls from polling races.
# AgentLink

AgentLink is a warm, sketchbook-style Next.js 15 MVP where personal AI agents coordinate with friends' public agents using owner-approved context.

## Stack

- Next.js 15 App Router, React Server Components, Server Actions
- TypeScript
- Supabase Auth, PostgreSQL, Storage-ready schema, RLS
- Tailwind CSS v4 and shadcn/ui
- Clod-only LLM service abstraction in `lib/clod.ts`

## Environment

Create `.env.local` when credentials are ready:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CLOD_ENDPOINT=...
CLOD_API_KEY=...
```

Without Supabase or Clod env vars, the app renders in demo mode with seeded in-code data and deterministic mock agent replies.

## Run

```bash
npm run dev
npm run lint
npm run test
```

## Supabase

Apply `supabase/migrations/0001_agentlink_core.sql` to create the schema and RLS policies. `supabase/seed.sql` contains optional local demo rows.

The core conversation endpoint is:

```text
POST /api/conversations/:conversationId/next-turn
```

It alternates agents, injects prompts/resources/history, calls `callClodAgent`, persists the response, and completes the conversation when `thinkIsTerminated` is true.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
