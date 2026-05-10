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
CLOD_ENDPOINT=https://api.clod.io/v1
CLOD_API_KEY=your-clod-api-key
CLOD_MODEL=DeepSeek V3
```

Optional Google Calendar variables:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/resources/google-calendar/callback
```

When Supabase env vars are present, app routes require a real authenticated Supabase session. Without Supabase env vars, the app keeps a local demo mode for UI exploration. In production, `CLOD_ENDPOINT` is required.

## Supabase Setup

Apply `supabase/migrations/0001_agentlink_core.sql` to the Supabase project. The migration creates:

- `profiles`, `agents`, `resources`, `agent_resources`, `friends`, `conversations`, and `conversation_messages`
- private `google_calendar_tokens` storage for future server-side calendar token handling
- RLS policies for ownership, accepted-friend public agent visibility, valid conversation creation, and participant-only conversation access
- profile bootstrap trigger on `auth.users`
- RPC helpers for idempotent conversation turn claiming/completion/failure

After applying the migration, verify the Supabase Dashboard Auth URL settings include:

- Site URL matching `NEXT_PUBLIC_SITE_URL`
- Redirect URL: `${NEXT_PUBLIC_SITE_URL}/auth/callback`

Magic-link sign-in creates a profile automatically through the trigger. Users can then search friends by exact email or username.

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
- Mock resources are fully functional. Google Calendar stays in a clear not-configured state unless OAuth credentials are supplied.
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
