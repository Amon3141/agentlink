import type {
  Agent,
  ConversationMessage,
  ConversationWithMessages,
  Friend,
  Resource,
} from "@/lib/types"

const now = new Date().toISOString()

export const demoAgents: Agent[] = [
  {
    id: "agent-mochi",
    user_id: "demo-user",
    name: "Mochi",
    role: "Warm scheduling helper",
    system_prompt:
      "You are Mochi, a gentle and concise personal agent who helps coordinate plans while respecting preferences.",
    avatar_url: null,
    is_public: true,
    created_at: now,
  },
  {
    id: "agent-sora",
    user_id: "demo-user",
    name: "Sora",
    role: "Thoughtful project companion",
    system_prompt:
      "You are Sora, a helpful agent who remembers context and asks clear follow-up questions.",
    avatar_url: null,
    is_public: false,
    created_at: now,
  },
]

export const demoResources: Resource[] = [
  {
    id: "resource-availability",
    user_id: "demo-user",
    type: "mock",
    name: "Availability notes",
    config: {
      text: "Weekdays after 5pm are best. Prefer coffee shops or quiet parks. Avoid Friday mornings.",
    },
    created_at: now,
  },
  {
    id: "resource-soft-hold",
    user_id: "demo-user",
    type: "soft_hold_calendar",
    name: "Soft hold calendar",
    config: {
      timezone: "local",
      defaultDurationMinutes: 30,
      notes: "",
    },
    created_at: now,
  },
  {
    id: "resource-calendar",
    user_id: "demo-user",
    type: "google_calendar",
    name: "Google Calendar",
    config: { connected: false, note: "Connect OAuth when credentials are ready." },
    created_at: now,
  },
]

export const demoFriends: Friend[] = [
  {
    id: "friend-1",
    user_id: "demo-user",
    friend_id: "demo-friend-a",
    status: "accepted",
    direction: "outgoing",
    profile: {
      id: "demo-friend-a",
      username: "hana",
      email: "hana@example.com",
      avatar_url: null,
    },
    public_agents: [
      {
        id: "agent-hana-pip",
        user_id: "demo-friend-a",
        name: "Pip",
        role: "Playful calendar scout",
        system_prompt:
          "You are Pip, Hana's friendly scheduling agent. Be cheerful and practical.",
        avatar_url: null,
        is_public: true,
        created_at: now,
      },
    ],
  },
  {
    id: "friend-2",
    user_id: "demo-user",
    friend_id: "demo-friend-b",
    status: "accepted",
    direction: "outgoing",
    profile: {
      id: "demo-friend-b",
      username: "ren",
      email: "ren@example.com",
      avatar_url: null,
    },
    public_agents: [
      {
        id: "agent-ren-kiki",
        user_id: "demo-friend-b",
        name: "Kiki",
        role: "Concise context courier",
        system_prompt:
          "You are Kiki, Ren's precise agent for lightweight coordination.",
        avatar_url: null,
        is_public: true,
        created_at: now,
      },
    ],
  },
]

const demoMessages: ConversationMessage[] = [
  {
    id: "message-1",
    conversation_id: "conversation-demo",
    sender_agent_id: "agent-mochi",
    content:
      "Hi Pip! Amon would love to schedule a casual hangout next week. Weekday evenings after 5pm are best.",
    is_termination: false,
    termination_reason: null,
    turn_number: 1,
    status: "completed",
    created_at: now,
  },
  {
    id: "message-2",
    conversation_id: "conversation-demo",
    sender_agent_id: "agent-hana-pip",
    content:
      "That sounds lovely. Hana is free Tuesday after 6pm, and a quiet cafe would be perfect.",
    is_termination: true,
    termination_reason:
      "Goal achieved: both sides found a likely Tuesday evening cafe plan.",
    turn_number: 2,
    status: "completed",
    created_at: now,
  },
]

export const demoConversations: ConversationWithMessages[] = [
  {
    id: "conversation-demo",
    initiator_id: "demo-user",
    my_agent_id: "agent-mochi",
    friend_agent_id: "agent-hana-pip",
    friend_user_id: "demo-friend-a",
    purpose: "Schedule a casual hangout next week",
    status: "completed",
    outcome: {
      summary: "Tuesday after 6pm at a quiet cafe looks good.",
      nextAction: "Approve and add a tentative calendar event.",
    },
    created_at: now,
    my_agent: demoAgents[0],
    friend_agent: demoFriends[0].public_agents[0],
    messages: demoMessages,
  },
]
