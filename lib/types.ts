export type Agent = {
  id: string
  user_id: string
  name: string
  role: string
  system_prompt: string
  avatar_url: string | null
  is_public: boolean
  created_at: string
}

export type Resource = {
  id: string
  user_id: string
  type: "mock" | "google_calendar"
  name: string
  config: Record<string, unknown>
  created_at: string
}

export type FriendProfile = {
  id: string
  username: string
  email: string
  avatar_url: string | null
}

export type Friend = {
  id: string
  user_id: string
  friend_id: string
  status: "pending" | "accepted"
  direction: "incoming" | "outgoing"
  profile: FriendProfile
  public_agents: Agent[]
}

export type Conversation = {
  id: string
  initiator_id: string
  my_agent_id: string
  friend_agent_id: string
  friend_user_id: string
  purpose: string
  status: "ongoing" | "completed" | "failed"
  outcome: Record<string, unknown> | null
  created_at: string
}

export type ConversationMessage = {
  id: string
  conversation_id: string
  sender_agent_id: string
  content: string
  is_termination: boolean
  termination_reason: string | null
  turn_number: number
  status: "pending" | "completed" | "failed"
  created_at: string
}

export type ConversationWithMessages = Conversation & {
  my_agent: Agent
  friend_agent: Agent
  messages: ConversationMessage[]
}

export type ClodAgentResponse = {
  message: string
  thinkIsTerminated: boolean
  thinkIsTerminatedReason: string
}

export type ConversationTurnClaim = {
  status: "claimed" | "in_progress" | "completed" | "failed" | "missing"
  message_id: string | null
  turn_number: number | null
  sender_agent_id: string | null
}
