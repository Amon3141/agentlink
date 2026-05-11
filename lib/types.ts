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
  type:
    | "mock"
    | "google_calendar"
    | "availability_policy"
    | "soft_hold_calendar"
    | "sharing_rules"
  name: string
  config: Record<string, unknown>
  created_at: string
}

export type SoftHold = {
  id: string
  user_id: string
  resource_id: string
  title: string
  start_at: string
  end_at: string
  status: "tentative" | "confirmed" | "cancelled"
  created_by: "owner" | "agent"
  created_via_tool_id: string | null
  conversation_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type McpProvider = "github" | "google_calendar" | "gmail" | "slack" | "internal"

export type McpConnectionStatus = "connected" | "revoked" | "error"

export type McpConnection = {
  id: string
  user_id: string
  provider: McpProvider
  provider_account_id: string | null
  display_name: string
  status: McpConnectionStatus
  scopes: string[]
  expires_at: string | null
  last_refreshed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type McpTool = {
  id: string
  provider: McpProvider
  name: string
  description: string
  input_schema: Record<string, unknown>
  default_scopes: string[]
  is_write: boolean
  created_at: string
}

export type AgentToolPermission = {
  agent_id: string
  connection_id: string
  tool_id: string
  user_id: string
  created_at: string
}

export type ToolCallAudit = {
  id: string
  user_id: string
  agent_id: string
  connection_id: string | null
  conversation_id: string | null
  provider: McpProvider
  tool_id: string
  inputs_summary: Record<string, unknown>
  result_summary: Record<string, unknown>
  status: "success" | "denied" | "error"
  error_message: string | null
  created_at: string
}

export type ProviderConnectionCard = {
  provider: McpProvider
  label: string
  description: string
  configured: boolean
  status: "not_configured" | "not_connected" | McpConnectionStatus
  connection: McpConnection | null
  tools: McpTool[]
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
  toolRequest?: {
    toolId: string
    connectionId: string
    input: Record<string, unknown>
  }
}

export type ConversationTurnClaim = {
  status: "claimed" | "in_progress" | "completed" | "failed" | "missing"
  message_id: string | null
  turn_number: number | null
  sender_agent_id: string | null
}
