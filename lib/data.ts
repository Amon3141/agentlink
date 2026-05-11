import { cache } from "react"
import { demoAgents, demoConversations, demoFriends, demoResources } from "@/lib/demo-data"
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server"
import { hasGoogleCalendarEnv, hasProviderOAuthEnv } from "@/lib/env"
import { providerDefinitions } from "@/lib/providers/registry"
import type {
  Agent,
  AgentToolPermission,
  Conversation,
  ConversationMessage,
  ConversationWithMessages,
  Friend,
  FriendProfile,
  McpConnection,
  McpTool,
  ProviderConnectionCard,
  Resource,
  SoftHold,
  ToolCallAudit,
} from "@/lib/types"

type FriendRow = {
  id: string
  user_id: string
  friend_id: string
  status: "pending" | "accepted"
}

export const getCurrentUserProfile = cache(async (): Promise<FriendProfile> => {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || userId === "demo-user") {
    return {
      id: "demo-user",
      username: "Explorer",
      email: "",
      avatar_url: null,
    }
  }

  if (!userId) {
    return {
      id: "guest",
      username: "Guest",
      email: "",
      avatar_url: null,
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, email, avatar_url")
    .eq("id", userId)
    .maybeSingle()

  if (profile) {
    return profile as FriendProfile
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const email = user.email ?? ""
    return {
      id: user.id,
      username: email ? (email.split("@")[0] ?? "You") : "You",
      email,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    }
  }

  return {
    id: userId,
    username: "You",
    email: "",
    avatar_url: null,
  }
})

export const getAgents = cache(async (): Promise<Agent[]> => {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    return demoAgents
  }

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    return []
  }

  return (data ?? []) as Agent[]
})

export async function getAgent(agentId: string): Promise<Agent | null> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return (
      demoAgents.find((agent) => agent.id === agentId) ??
      demoFriends.flatMap((friend) => friend.public_agents).find((agent) => agent.id === agentId) ??
      null
    )
  }

  const { data } = await supabase.from("agents").select("*").eq("id", agentId).single()
  return (data as Agent | null) ?? null
}

export async function getAgentResourceIds(agentId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return demoResources.map((resource) => resource.id)
  }

  const { data } = await supabase
    .from("agent_resources")
    .select("resource_id")
    .eq("agent_id", agentId)

  return (data ?? []).map((row) => row.resource_id as string)
}

export async function getAgentToolPermissionIds(agentId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    return []
  }

  const { data } = await supabase
    .from("agent_tool_permissions")
    .select("connection_id,tool_id")
    .eq("agent_id", agentId)
    .eq("user_id", userId)

  return ((data ?? []) as Pick<AgentToolPermission, "connection_id" | "tool_id">[])
    .map((row) => `${row.connection_id}:${row.tool_id}`)
}

type SupabaseServer = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

/** Creates the built-in calendar when missing. Returns a user-visible error message on failure. */
async function ensureDefaultSoftHoldCalendar(
  supabase: SupabaseServer,
  userId: string
): Promise<string | null> {
  const { data: rows, error: selectError } = await supabase
    .from("resources")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "soft_hold_calendar")
    .limit(1)

  if (selectError) {
    console.warn("[ensureDefaultSoftHoldCalendar] select failed:", selectError.message)
    return selectError.message
  }

  if (rows && rows.length > 0) {
    return null
  }

  const { error: insertError } = await supabase.from("resources").insert({
    user_id: userId,
    type: "soft_hold_calendar",
    name: "Soft hold calendar",
    config: {
      timezone: "local",
      defaultDurationMinutes: 30,
      notes: "",
    },
  })

  if (!insertError) {
    return null
  }

  if (insertError.code === "23505") {
    return null
  }

  console.warn("[ensureDefaultSoftHoldCalendar] insert failed:", insertError.message)
  return insertError.message
}

export const getResources = cache(
  async (): Promise<{ resources: Resource[]; fetchError: string | null }> => {
    const supabase = await createSupabaseServerClient()
    const userId = await getCurrentUserId()

    if (!supabase || !userId) {
      return { resources: demoResources, fetchError: null }
    }

    const ensureCalendarError = await ensureDefaultSoftHoldCalendar(supabase, userId)

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[getResources]", error.message)
      }
      return { resources: [], fetchError: error.message }
    }

    const resources = (data ?? []).map(sanitizeResource) as Resource[]
    const hasSoftHoldCalendar = resources.some((r) => r.type === "soft_hold_calendar")

    let fetchError: string | null = null
    if (ensureCalendarError && !hasSoftHoldCalendar) {
      fetchError =
        "Built-in soft hold calendar could not be created. Apply Supabase migrations through `0006_soft_hold_calendar_builtin.sql` (after `0003_custom_resources_soft_holds.sql`) and ensure your profile row exists. "
        + `Details: ${ensureCalendarError}`
    }

    return {
      resources,
      fetchError,
    }
  }
)

export const getSoftHolds = cache(async (): Promise<SoftHold[]> => {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    return []
  }

  const { data, error } = await supabase
    .from("soft_holds")
    .select("*")
    .eq("user_id", userId)
    .order("start_at", { ascending: true })

  if (error) {
    return []
  }

  return (data ?? []) as SoftHold[]
})

export const getProviderConnectionCards = cache(async (): Promise<ProviderConnectionCard[]> => {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    return providerDefinitions.map((provider) => ({
      provider: provider.id,
      label: provider.label,
      description: provider.description,
      configured: hasProviderOAuthEnv(provider.id),
      status: "not_connected",
      connection: null,
      tools: [],
    }))
  }

  await ensureInternalConnection(userId)

  const [{ data: connections }, { data: tools }] = await Promise.all([
    supabase
      .from("mcp_connections")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("mcp_tools")
      .select("*")
      .order("provider", { ascending: true })
      .order("is_write", { ascending: true }),
  ])

  const safeConnections = ((connections ?? []) as McpConnection[]).map(sanitizeConnection)
  const safeTools = (tools ?? []) as McpTool[]

  return providerDefinitions.map((provider) => {
    const connection =
      safeConnections.find((item) => item.provider === provider.id && item.status === "connected") ??
      safeConnections.find((item) => item.provider === provider.id) ??
      null
    const configured = hasProviderOAuthEnv(provider.id)
    const isInternal = provider.id === "internal"

    return {
      provider: provider.id,
      label: provider.label,
      description: provider.description,
      configured: isInternal || configured,
      status: configured
        ? connection?.status ?? "not_connected"
        : isInternal
          ? connection?.status ?? "not_connected"
        : "not_configured",
      connection,
      tools: safeTools.filter((tool) => tool.provider === provider.id),
    }
  })
})

export const getMcpTools = cache(async (): Promise<McpTool[]> => {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return []
  }

  const { data } = await supabase
    .from("mcp_tools")
    .select("*")
    .order("provider", { ascending: true })
    .order("is_write", { ascending: true })

  return (data ?? []) as McpTool[]
})

export async function getConversationToolAudits(
  conversationId: string
): Promise<ToolCallAudit[]> {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return []
  }

  const { data } = await supabase
    .from("tool_call_audit")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  return (data ?? []) as ToolCallAudit[]
}

export const getFriends = cache(async (): Promise<Friend[]> => {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    return demoFriends
  }

  const { data: rows } = await supabase
    .from("friends")
    .select("id,user_id,friend_id,status")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .order("created_at", { ascending: false })

  if (!rows) {
    return []
  }

  const friends = await Promise.all(
    rows.map(async (row) => {
      const friendRow = row as FriendRow
      const otherUserId =
        friendRow.user_id === userId ? friendRow.friend_id : friendRow.user_id
      const direction = friendRow.user_id === userId ? "outgoing" : "incoming"
      const [{ data: profile }, { data: publicAgents }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,username,email,avatar_url")
          .eq("id", otherUserId)
          .single(),
        friendRow.status === "accepted"
          ? supabase
              .from("agents")
              .select("*")
              .eq("user_id", otherUserId)
              .eq("is_public", true)
          : Promise.resolve({ data: [] }),
      ])

      if (!profile) {
        return null
      }

      return {
        id: friendRow.id,
        user_id: friendRow.user_id,
        friend_id: friendRow.friend_id,
        status: friendRow.status,
        direction,
        profile,
        public_agents: (publicAgents ?? []) as Agent[],
      } as Friend
    })
  )

  return friends.filter((friend): friend is Friend => Boolean(friend))
})

export const getPublicFriendAgents = cache(async (): Promise<(Agent & {
  friendUserId: string
  friendName: string
})[]> => {
  const friends = await getFriends()

  return friends
    .filter((friend) => friend.status === "accepted")
    .flatMap((friend) =>
      friend.public_agents.map((agent) => ({
        ...agent,
        friendUserId: friend.profile.id,
        friendName: friend.profile.username,
      }))
    )
})

export const getConversations = cache(async (): Promise<ConversationWithMessages[]> => {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    return demoConversations
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .or(`initiator_id.eq.${userId},friend_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })

  if (!conversations) {
    return []
  }

  const seen = new Set<string>()
  const uniqueRows = conversations.filter((row) => {
    if (seen.has(row.id)) {
      return false
    }
    seen.add(row.id)
    return true
  })

  return Promise.all(
    uniqueRows.map(async (conversation) => hydrateConversation(conversation as Conversation))
  )
})

export async function getConversation(
  conversationId: string
): Promise<ConversationWithMessages | null> {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return demoConversations.find((item) => item.id === conversationId) ?? null
  }

  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single()

  return data ? hydrateConversation(data as Conversation) : null
}

async function hydrateConversation(
  conversation: Conversation
): Promise<ConversationWithMessages> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return (
      demoConversations.find((item) => item.id === conversation.id) ??
      demoConversations[0]
    )
  }

  const [{ data: myAgent }, { data: friendAgent }, { data: messages }] =
    await Promise.all([
      supabase.from("agents").select("*").eq("id", conversation.my_agent_id).single(),
      supabase.from("agents").select("*").eq("id", conversation.friend_agent_id).single(),
      supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("turn_number", { ascending: true }),
    ])

  return {
    ...conversation,
    my_agent: myAgent as Agent,
    friend_agent: friendAgent as Agent,
    messages: (messages ?? []) as ConversationMessage[],
  }
}

function sanitizeResource(resource: Resource): Resource {
  if (resource.type !== "google_calendar") {
    return resource
  }

  return {
    ...resource,
    config: {
      connected: Boolean(resource.config.connected),
      configured: hasGoogleCalendarEnv(),
      note: hasGoogleCalendarEnv()
        ? "Calendar OAuth is configured. Tokens stay server-side."
        : "Google Calendar credentials are not configured.",
    },
  }
}

function sanitizeConnection(connection: McpConnection): McpConnection {
  return {
    ...connection,
    metadata: {
      email: connection.metadata.email,
      avatarUrl: connection.metadata.avatarUrl,
      profileUrl: connection.metadata.profileUrl,
      teamId: connection.metadata.teamId,
    },
  }
}

async function ensureInternalConnection(userId: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return
  }

  const { data: existing } = await supabase
    .from("mcp_connections")
    .select("id,status")
    .eq("user_id", userId)
    .eq("provider", "internal")
    .maybeSingle()

  if (existing) {
    if (existing.status !== "connected") {
      await supabase
        .from("mcp_connections")
        .update({ status: "connected", updated_at: new Date().toISOString() })
        .eq("id", existing.id as string)
        .eq("user_id", userId)
    }
    return
  }

  await supabase.from("mcp_connections").insert({
    user_id: userId,
    provider: "internal",
    provider_account_id: "agentlink",
    display_name: "AgentLink first-party tools",
    status: "connected",
    scopes: [],
    metadata: { firstParty: true },
  })
}
