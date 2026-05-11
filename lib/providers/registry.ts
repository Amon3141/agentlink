import { z } from "zod"
import { softHoldInputSchema, softHoldWindowSchema } from "@/lib/resources/schemas"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type { McpProvider } from "@/lib/types"

export const providerSlugs = {
  github: "github",
  "google-calendar": "google_calendar",
  gmail: "gmail",
  slack: "slack",
  internal: "internal",
} as const

export type ProviderSlug = keyof typeof providerSlugs

export type ProviderDefinition = {
  id: McpProvider
  slug: ProviderSlug
  label: string
  description: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  accountUrl?: string
}

export type ProviderToolExecutionContext = {
  accessToken: string
  connectionId: string
  userId: string
  agentId?: string
  conversationId?: string | null
  signal?: AbortSignal
}

export type ProviderToolDefinition = {
  id: string
  provider: McpProvider
  label: string
  description: string
  isWrite: boolean
  inputSchema: z.ZodType<Record<string, unknown>>
  execute: (
    input: Record<string, unknown>,
    context: ProviderToolExecutionContext
  ) => Promise<ProviderToolResult>
}

export type ProviderToolResult = {
  summary: string
  data: Record<string, unknown>
}

type JsonRecord = Record<string, unknown>

const limitSchema = z.coerce.number().int().min(1).max(10).optional()

const providers: ProviderDefinition[] = [
  {
    id: "github",
    slug: "github",
    label: "GitHub",
    description: "Read issues and pull requests, with optional comment drafting/posting later.",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo"],
    accountUrl: "https://api.github.com/user",
  },
  {
    id: "google_calendar",
    slug: "google-calendar",
    label: "Google Calendar",
    description: "Check availability and create tentative plans when explicitly approved.",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    accountUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  {
    id: "gmail",
    slug: "gmail",
    label: "Gmail",
    description: "Search limited message snippets and create drafts with explicit approval.",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    accountUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  {
    id: "slack",
    slug: "slack",
    label: "Slack",
    description: "Search allowed messages and post only with explicit write approval.",
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["search:read"],
    accountUrl: "https://slack.com/api/auth.test",
  },
  {
    id: "internal",
    slug: "internal",
    label: "AgentLink",
    description: "Use first-party availability policies and calendar plans without external OAuth.",
    authUrl: "",
    tokenUrl: "",
    scopes: [],
  },
]

export const providerDefinitions = providers

export function getProviderDefinition(provider: string) {
  const normalized = normalizeProvider(provider)
  return providers.find((item) => item.id === normalized) ?? null
}

export function normalizeProvider(value: string): McpProvider | null {
  if (value in providerSlugs) {
    return providerSlugs[value as ProviderSlug]
  }

  if (providers.some((provider) => provider.id === value)) {
    return value as McpProvider
  }

  return null
}

export function getProviderSlug(provider: McpProvider) {
  return providers.find((item) => item.id === provider)?.slug ?? provider
}

export const providerTools: ProviderToolDefinition[] = [
  {
    id: "internal.check_availability",
    provider: "internal",
    label: "Check AgentLink calendar availability",
    description: "Check tentative and confirmed calendar plans for a requested time window.",
    isWrite: false,
    inputSchema: softHoldWindowSchema,
    execute: async (input, context) => {
      const parsed = softHoldWindowSchema.parse(input)
      await assertAttachedSoftHoldCalendar(parsed.resourceId, context)
      const holds = await getOverlappingSoftHolds({
        userId: context.userId,
        resourceId: parsed.resourceId,
        timeMin: parsed.timeMin,
        timeMax: parsed.timeMax,
        limit: parsed.limit,
      })

      return {
        summary: holds.length === 0
          ? "AgentLink calendar appears available."
          : "AgentLink calendar has tentative or confirmed plans.",
        data: {
          available: holds.length === 0,
          holds: holds.map(summarizeSoftHold),
        },
      }
    },
  },
  {
    id: "internal.create_soft_hold",
    provider: "internal",
    label: "Create AgentLink calendar plan",
    description: "Create a tentative plan on an owner-approved AgentLink calendar.",
    isWrite: true,
    inputSchema: softHoldInputSchema,
    execute: async (input, context) => {
      const parsed = softHoldInputSchema.parse(input)
      await assertAttachedSoftHoldCalendar(parsed.resourceId, context)
      const overlaps = await getOverlappingSoftHolds({
        userId: context.userId,
        resourceId: parsed.resourceId,
        timeMin: parsed.start,
        timeMax: parsed.end,
        limit: 5,
      })

      if (overlaps.length > 0) {
        return {
          summary: "Plan was not created because the requested window overlaps an existing plan.",
          data: {
            created: false,
            available: false,
            holds: overlaps.map(summarizeSoftHold),
          },
        }
      }

      const admin = createSupabaseAdminClient()
      if (!admin) {
        throw new Error("Internal tool execution is not configured.")
      }

      const { data, error } = await admin
        .from("soft_holds")
        .insert({
          user_id: context.userId,
          resource_id: parsed.resourceId,
          title: parsed.title,
          start_at: parsed.start,
          end_at: parsed.end,
          notes: parsed.notes ?? "",
          status: "tentative",
          created_by: "agent",
          created_via_tool_id: "internal.create_soft_hold",
          conversation_id: context.conversationId ?? null,
        })
        .select("id,title,start_at,end_at,status,created_by")
        .single()

      if (error || !data) {
        throw new Error("Plan could not be created.")
      }

      return {
        summary: "Created a tentative AgentLink plan.",
        data: {
          created: true,
          hold: summarizeSoftHold(data as JsonRecord),
        },
      }
    },
  },
  {
    id: "internal.list_soft_holds",
    provider: "internal",
    label: "List AgentLink calendar plans",
    description: "List sanitized AgentLink plans in a requested time window.",
    isWrite: false,
    inputSchema: softHoldWindowSchema,
    execute: async (input, context) => {
      const parsed = softHoldWindowSchema.parse(input)
      await assertAttachedSoftHoldCalendar(parsed.resourceId, context)
      const holds = await getOverlappingSoftHolds({
        userId: context.userId,
        resourceId: parsed.resourceId,
        timeMin: parsed.timeMin,
        timeMax: parsed.timeMax,
        limit: parsed.limit,
        includeCancelled: true,
      })

      return {
        summary: `Found ${holds.length} AgentLink plan(s).`,
        data: { holds: holds.map(summarizeSoftHold) },
      }
    },
  },
  {
    id: "github.search_issues",
    provider: "github",
    label: "Search GitHub issues and pull requests",
    description: "Search readable issues and pull requests.",
    isWrite: false,
    inputSchema: z.object({
      query: z.string().min(1).max(300),
      limit: limitSchema,
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        query: z.string(),
        limit: limitSchema.default(5),
      }).parse(input)
      const url = new URL("https://api.github.com/search/issues")
      url.searchParams.set("q", parsed.query)
      url.searchParams.set("per_page", String(parsed.limit))
      const body = await providerFetchJson(url, context.accessToken, context.signal)
      const items = Array.isArray(body.items)
        ? (body.items.slice(0, parsed.limit) as JsonRecord[])
        : []
      return {
        summary: `Found ${items.length} GitHub issue or pull request result(s).`,
        data: {
          items: items.map((item) => ({
            title: item.title,
            url: item.html_url,
            state: item.state,
            number: item.number,
            repositoryUrl: item.repository_url,
          })),
        },
      }
    },
  },
  {
    id: "github.read_issue",
    provider: "github",
    label: "Read GitHub issue or pull request",
    description: "Read metadata and body for a specific issue or pull request.",
    isWrite: false,
    inputSchema: z.object({
      owner: z.string().min(1).max(120),
      repo: z.string().min(1).max(120),
      number: z.coerce.number().int().positive(),
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        owner: z.string(),
        repo: z.string(),
        number: z.coerce.number().int().positive(),
      }).parse(input)
      const body = await providerFetchJson(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`,
        context.accessToken,
        context.signal
      )
      return {
        summary: `${body.title ?? "GitHub item"} is ${body.state ?? "unknown"}.`,
        data: {
          title: body.title,
          state: body.state,
          url: body.html_url,
          body: truncateText(body.body),
          author: getNestedString(body, "user", "login"),
        },
      }
    },
  },
  {
    id: "github.create_comment",
    provider: "github",
    label: "Create GitHub comment",
    description: "Create a comment on an approved issue or pull request.",
    isWrite: true,
    inputSchema: z.object({
      owner: z.string().min(1).max(120),
      repo: z.string().min(1).max(120),
      number: z.coerce.number().int().positive(),
      body: z.string().min(1).max(2000),
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        owner: z.string(),
        repo: z.string(),
        number: z.coerce.number().int().positive(),
        body: z.string(),
      }).parse(input)
      const body = await providerFetchJson(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}/comments`,
        context.accessToken,
        context.signal,
        {
          method: "POST",
          body: JSON.stringify({ body: parsed.body }),
        }
      )
      return {
        summary: "Created a GitHub comment.",
        data: { url: body.html_url },
      }
    },
  },
  {
    id: "google_calendar.list_events",
    provider: "google_calendar",
    label: "Read Google Calendar events",
    description: "Read upcoming primary calendar events.",
    isWrite: false,
    inputSchema: z.object({
      timeMin: z.string().datetime().optional(),
      timeMax: z.string().datetime().optional(),
      limit: limitSchema,
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        timeMin: z.string().datetime().optional(),
        timeMax: z.string().datetime().optional(),
        limit: limitSchema.default(5),
      }).parse(input)
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
      url.searchParams.set("singleEvents", "true")
      url.searchParams.set("orderBy", "startTime")
      url.searchParams.set("maxResults", String(parsed.limit))
      url.searchParams.set("timeMin", parsed.timeMin ?? new Date().toISOString())
      if (parsed.timeMax) {
        url.searchParams.set("timeMax", parsed.timeMax)
      }
      const body = await providerFetchJson(url, context.accessToken, context.signal)
      const items = Array.isArray(body.items)
        ? (body.items.slice(0, parsed.limit) as JsonRecord[])
        : []
      return {
        summary: `Found ${items.length} upcoming calendar event(s).`,
        data: {
          events: items.map((item) => ({
            summary: item.summary ?? "Busy",
            start: getNestedString(item, "start", "dateTime") ?? getNestedString(item, "start", "date"),
            end: getNestedString(item, "end", "dateTime") ?? getNestedString(item, "end", "date"),
            status: item.status,
          })),
        },
      }
    },
  },
  {
    id: "google_calendar.check_availability",
    provider: "google_calendar",
    label: "Check Google Calendar availability",
    description: "Check busy blocks in a time window.",
    isWrite: false,
    inputSchema: z.object({
      timeMin: z.string().datetime(),
      timeMax: z.string().datetime(),
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        timeMin: z.string().datetime(),
        timeMax: z.string().datetime(),
      }).parse(input)
      const body = await providerFetchJson(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        context.accessToken,
        context.signal,
        {
          method: "POST",
          body: JSON.stringify({
            timeMin: parsed.timeMin,
            timeMax: parsed.timeMax,
            items: [{ id: "primary" }],
          }),
        }
      )
      const primaryCalendar = getNestedObject(body, "calendars", "primary")
      const busy = primaryCalendar && Array.isArray(primaryCalendar.busy)
        ? primaryCalendar.busy
        : []
      return {
        summary: busy.length === 0 ? "Calendar appears available." : "Calendar has busy blocks.",
        data: { available: busy.length === 0, busy },
      }
    },
  },
  {
    id: "google_calendar.create_tentative_event",
    provider: "google_calendar",
    label: "Create tentative Google Calendar event",
    description: "Create a tentative plan on the primary calendar.",
    isWrite: true,
    inputSchema: z.object({
      summary: z.string().min(1).max(200),
      start: z.string().datetime(),
      end: z.string().datetime(),
      description: z.string().max(1000).optional(),
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        summary: z.string(),
        start: z.string().datetime(),
        end: z.string().datetime(),
        description: z.string().optional(),
      }).parse(input)
      const body = await providerFetchJson(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        context.accessToken,
        context.signal,
        {
          method: "POST",
          body: JSON.stringify({
            summary: parsed.summary,
            description: parsed.description,
            transparency: "opaque",
            status: "tentative",
            start: { dateTime: parsed.start },
            end: { dateTime: parsed.end },
          }),
        }
      )
      return {
        summary: "Created a tentative calendar plan.",
        data: { eventId: body.id, htmlLink: body.htmlLink },
      }
    },
  },
  {
    id: "gmail.search_messages",
    provider: "gmail",
    label: "Search Gmail message snippets",
    description: "Search messages and return limited metadata/snippets.",
    isWrite: false,
    inputSchema: z.object({
      query: z.string().min(1).max(300),
      limit: limitSchema,
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        query: z.string(),
        limit: limitSchema.default(5),
      }).parse(input)
      const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
      listUrl.searchParams.set("q", parsed.query)
      listUrl.searchParams.set("maxResults", String(parsed.limit))
      const list = await providerFetchJson(listUrl, context.accessToken, context.signal)
      const messages = Array.isArray(list.messages)
        ? (list.messages.slice(0, parsed.limit) as JsonRecord[])
        : []
      const details = await Promise.all(
        messages.map((message) =>
          providerFetchJson(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata`,
            context.accessToken,
            context.signal
          )
        )
      )
      return {
        summary: `Found ${details.length} Gmail message(s).`,
        data: {
          messages: details.map((message) => ({
            id: message.id,
            snippet: truncateText(message.snippet, 240),
            subject: headerValue(message, "Subject"),
            from: headerValue(message, "From"),
            date: headerValue(message, "Date"),
          })),
        },
      }
    },
  },
  {
    id: "gmail.create_draft",
    provider: "gmail",
    label: "Create Gmail draft",
    description: "Create a draft email without sending.",
    isWrite: true,
    inputSchema: z.object({
      to: z.string().email(),
      subject: z.string().min(1).max(200),
      body: z.string().min(1).max(4000),
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      }).parse(input)
      const raw = Buffer.from(
        [`To: ${parsed.to}`, `Subject: ${parsed.subject}`, "", parsed.body].join("\r\n")
      )
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
      const body = await providerFetchJson(
        "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
        context.accessToken,
        context.signal,
        {
          method: "POST",
          body: JSON.stringify({ message: { raw } }),
        }
      )
      return {
        summary: "Created a Gmail draft.",
        data: { draftId: body.id },
      }
    },
  },
  {
    id: "slack.search_messages",
    provider: "slack",
    label: "Search Slack messages",
    description: "Search Slack messages visible to the connected account.",
    isWrite: false,
    inputSchema: z.object({
      query: z.string().min(1).max(300),
      limit: limitSchema,
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        query: z.string(),
        limit: limitSchema.default(5),
      }).parse(input)
      const url = new URL("https://slack.com/api/search.messages")
      url.searchParams.set("query", parsed.query)
      url.searchParams.set("count", String(parsed.limit))
      const body = await providerFetchJson(url, context.accessToken, context.signal)
      const slackMessages = getNestedArray(body, "messages", "matches")
      const matches = slackMessages
        ? slackMessages.slice(0, parsed.limit)
        : []
      return {
        summary: `Found ${matches.length} Slack message(s).`,
        data: {
          messages: matches.map((message) => ({
            channel: getNestedString(message, "channel", "name"),
            user: message.user,
            text: truncateText(message.text, 240),
            permalink: message.permalink,
          })),
        },
      }
    },
  },
  {
    id: "slack.post_message",
    provider: "slack",
    label: "Post Slack message",
    description: "Post a message to an approved channel.",
    isWrite: true,
    inputSchema: z.object({
      channel: z.string().min(1).max(120),
      text: z.string().min(1).max(2000),
    }),
    execute: async (input, context) => {
      const parsed = z.object({
        channel: z.string(),
        text: z.string(),
      }).parse(input)
      const body = await providerFetchJson(
        "https://slack.com/api/chat.postMessage",
        context.accessToken,
        context.signal,
        {
          method: "POST",
          body: JSON.stringify(parsed),
        }
      )
      return {
        summary: "Posted a Slack message.",
        data: { channel: body.channel, ts: body.ts },
      }
    },
  },
]

export function getProviderTool(toolId: string) {
  return providerTools.find((tool) => tool.id === toolId) ?? null
}

function truncateText(value: unknown, maxLength = 1000) {
  const text = typeof value === "string" ? value : ""
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function getNestedString(object: JsonRecord, key: string, nestedKey: string) {
  const value = object[key]

  if (!value || typeof value !== "object" || !(nestedKey in value)) {
    return undefined
  }

  const nested = (value as JsonRecord)[nestedKey]
  return typeof nested === "string" ? nested : undefined
}

function getNestedArray(object: JsonRecord, key: string, nestedKey: string) {
  const value = object[key]

  if (!value || typeof value !== "object" || !(nestedKey in value)) {
    return null
  }

  const nested = (value as JsonRecord)[nestedKey]
  return Array.isArray(nested) ? (nested as JsonRecord[]) : null
}

function getNestedObject(object: JsonRecord, key: string, nestedKey: string) {
  const value = object[key]

  if (!value || typeof value !== "object" || !(nestedKey in value)) {
    return null
  }

  const nested = (value as JsonRecord)[nestedKey]
  return nested && typeof nested === "object" ? (nested as JsonRecord) : null
}

function headerValue(message: Record<string, unknown>, name: string) {
  const headers = message.payload &&
    typeof message.payload === "object" &&
    "headers" in message.payload &&
    Array.isArray(message.payload.headers)
      ? (message.payload.headers as JsonRecord[])
      : []
  const match = headers.find((header) => header.name === name)
  return match && typeof match.value === "string" ? match.value : ""
}

async function assertAttachedSoftHoldCalendar(
  resourceId: string,
  context: ProviderToolExecutionContext
) {
  const admin = createSupabaseAdminClient()
  if (!admin || !context.agentId) {
    throw new Error("Internal tool execution is not configured.")
  }

  const { data: resource } = await admin
    .from("resources")
    .select("id,user_id,type")
    .eq("id", resourceId)
    .eq("user_id", context.userId)
    .eq("type", "soft_hold_calendar")
    .single()

  if (!resource) {
    throw new Error("Calendar is unavailable.")
  }

  const { data: binding } = await admin
    .from("agent_resources")
    .select("agent_id,resource_id")
    .eq("agent_id", context.agentId)
    .eq("resource_id", resourceId)
    .maybeSingle()

  if (!binding) {
    throw new Error("Calendar is not attached to this agent.")
  }
}

async function getOverlappingSoftHolds({
  userId,
  resourceId,
  timeMin,
  timeMax,
  limit,
  includeCancelled = false,
}: {
  userId: string
  resourceId: string
  timeMin: string
  timeMax: string
  limit: number
  includeCancelled?: boolean
}) {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    throw new Error("Internal tool execution is not configured.")
  }

  let query = admin
    .from("soft_holds")
    .select("id,title,start_at,end_at,status,created_by")
    .eq("user_id", userId)
    .eq("resource_id", resourceId)
    .lt("start_at", timeMax)
    .gt("end_at", timeMin)
    .order("start_at", { ascending: true })
    .limit(limit)

  if (!includeCancelled) {
    query = query.in("status", ["tentative", "confirmed"])
  }

  const { data, error } = await query

  if (error) {
    throw new Error("Calendar plans could not be checked.")
  }

  return (data ?? []) as JsonRecord[]
}

function summarizeSoftHold(hold: JsonRecord) {
  return {
    id: hold.id,
    title: hold.title,
    start: hold.start_at,
    end: hold.end_at,
    status: hold.status,
    createdBy: hold.created_by,
  }
}

async function providerFetchJson(
  url: string | URL,
  accessToken: string,
  signal?: AbortSignal,
  init: RequestInit = {}
): Promise<JsonRecord> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
    signal,
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.ok === false) {
    const message = body.error_description ?? body.error ?? `Provider request failed with ${response.status}`
    throw new Error(String(message))
  }

  return body as JsonRecord
}
