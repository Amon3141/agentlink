import { cache } from "react"
import { demoAgents, demoConversations, demoFriends, demoResources } from "@/lib/demo-data"
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server"
import { hasGoogleCalendarEnv } from "@/lib/env"
import type {
  Agent,
  Conversation,
  ConversationMessage,
  ConversationWithMessages,
  Friend,
  Resource,
} from "@/lib/types"

type FriendRow = {
  id: string
  user_id: string
  friend_id: string
  status: "pending" | "accepted"
}

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

export const getResources = cache(async (): Promise<Resource[]> => {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    return demoResources
  }

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    return []
  }

  return (data ?? []).map(sanitizeResource) as Resource[]
})

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

  return Promise.all(
    conversations.map(async (conversation) =>
      hydrateConversation(conversation as Conversation)
    )
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
