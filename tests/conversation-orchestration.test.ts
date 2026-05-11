import { describe, expect, it, vi } from "vitest"
import { callClodAgent } from "@/lib/clod"
import { summarizeResources } from "@/lib/conversations/resource-summary"
import {
  buildAgentSystemPrompt,
  buildTurnPrompt,
  formatConversationHistory,
} from "@/lib/conversations/prompt-builder"
import { getProviderTool } from "@/lib/providers/registry"
import { availabilityPolicyConfigSchema, softHoldInputSchema } from "@/lib/resources/schemas"
import { sanitizeInput } from "@/lib/providers/tool-runner"
import {
  parseClodAgentResponse,
  resolveClodAgentResponse,
} from "@/lib/validators/clod-response"
import type { Agent, ConversationMessage, Resource } from "@/lib/types"

const soraAgent = makeAgent("agent-sora", "Sora")
const lumoAgent = makeAgent("agent-lumo", "Lumo")

describe("conversation orchestration helpers", () => {
  it("builds an initial turn prompt", () => {
    const prompt = buildTurnPrompt({
      purpose: "Schedule a hangout",
      messages: [],
      turnNumber: 1,
      speakerAgent: soraAgent,
      listenerAgent: lumoAgent,
    })

    expect(prompt).toContain("Conversation objective: Schedule a hangout")
    expect(prompt).toContain("Sora, write your next message to Lumo.")
    expect(prompt).toContain("No prior messages")
    expect(prompt).not.toContain("Turn #")
  })

  it("does not put copyable placeholder responses in the system prompt", () => {
    const prompt = buildAgentSystemPrompt({
      agent: soraAgent,
      purpose: "Schedule a hangout",
      resources: [],
    })

    expect(prompt).toContain("Return exactly one valid JSON object")
    expect(prompt).not.toContain("Friendly natural language response")
    expect(prompt).not.toContain("Brief reason for the tool request")
  })

  it("formats long conversation history with a bounded recent window", () => {
    const messages = Array.from({ length: 16 }, (_, index) =>
      makeMessage({
        turnNumber: index + 1,
        senderAgentId: index % 2 === 0 ? soraAgent.id : lumoAgent.id,
        content: `Message ${index + 1} with details that should be summarized for long threads.`,
      })
    )

    const history = formatConversationHistory({
      messages,
      speakerAgent: soraAgent,
      listenerAgent: lumoAgent,
    })

    expect(history).toContain("Earlier context, compressed")
    expect(history).toContain("Recent messages")
    expect(history).toContain("Message 16")
    expect(history).not.toContain("Message 1 with details")
    expect(history).not.toContain("Turn #")
  })

  it("validates Clod JSON output", () => {
    const parsed = parseClodAgentResponse({
      message: "Tuesday works.",
      thinkIsTerminated: true,
      thinkIsTerminatedReason: "Goal achieved.",
    })

    expect(parsed.thinkIsTerminated).toBe(true)
  })

  it("validates structured Clod tool requests", () => {
    const parsed = parseClodAgentResponse({
      message: "I need to check the calendar first.",
      thinkIsTerminated: false,
      thinkIsTerminatedReason: "",
      toolRequest: {
        toolId: "google_calendar.check_availability",
        connectionId: "00000000-0000-4000-8000-000000000000",
        input: {
          timeMin: "2026-05-12T18:00:00.000Z",
          timeMax: "2026-05-12T18:30:00.000Z",
        },
      },
    })

    expect(parsed.toolRequest?.toolId).toBe("google_calendar.check_availability")
  })

  it("parses Clod output wrapped in markdown fences", () => {
    const raw = 'Sure:\n```json\n{"message":"Tuesday works.","thinkIsTerminated":true,"thinkIsTerminatedReason":"Done."}\n```'
    const resolved = resolveClodAgentResponse(raw)
    expect(resolved.message).toBe("Tuesday works.")
    expect(resolved.thinkIsTerminated).toBe(true)
  })

  it("defaults missing termination flags when JSON is otherwise valid", () => {
    const parsed = parseClodAgentResponse({
      message: "Still negotiating.",
    })

    expect(parsed.thinkIsTerminated).toBe(false)
    expect(parsed.thinkIsTerminatedReason).toBe("")
  })

  it("drops invalid tool requests instead of failing the turn", () => {
    const parsed = parseClodAgentResponse({
      message: "Bad tool.",
      thinkIsTerminated: false,
      thinkIsTerminatedReason: "",
      toolRequest: {
        toolId: "calendar/delete_everything",
        connectionId: "not-a-uuid",
        input: {},
      },
    })

    expect(parsed.toolRequest).toBeUndefined()
  })

  it("rejects unrecoverable Clod strings", () => {
    expect(() => parseClodAgentResponse("{ nope")).toThrow("invalid JSON")
  })

  it("falls back to plaintext via resolveClodAgentResponse", () => {
    const resolved = resolveClodAgentResponse("Hello — no JSON here.")
    expect(resolved.message).toContain("Hello")
    expect(resolved.thinkIsTerminated).toBe(false)
  })

  it("filters known template leaks before saving a Clod message", () => {
    const resolved = resolveClodAgentResponse({
      message: "Friendly natural language response...",
      thinkIsTerminated: false,
      thinkIsTerminatedReason: "",
    })

    expect(resolved.message).not.toContain("Friendly natural language response")
    expect(resolved.message).toContain("formatting glitch")
  })

  it("rejects malformed provider tool inputs", () => {
    const tool = getProviderTool("google_calendar.check_availability")

    expect(tool).not.toBeNull()
    expect(() =>
      tool?.inputSchema.parse({
        timeMin: "not-a-date",
        timeMax: "2026-05-12T18:30:00.000Z",
      })
    ).toThrow()
  })

  it("validates first-party resource config schemas", () => {
    const parsed = availabilityPolicyConfigSchema.parse({
      preferredDays: ["tuesday", "thursday"],
      preferredStart: "17:00",
      preferredEnd: "19:00",
      defaultDurationMinutes: 30,
      bufferMinutes: 15,
      focusBlocks: [
        {
          label: "Client review",
          days: ["tuesday"],
          start: "15:00",
          end: "17:00",
        },
      ],
      workPreference: "Clients only weekdays.",
      socialPreference: "Friends may ask for evenings.",
      notes: "Protect focus blocks.",
    })

    expect(parsed.preferredDays).toEqual(["tuesday", "thursday"])
    expect(() =>
      availabilityPolicyConfigSchema.parse({
        preferredDays: ["notaday"],
        preferredStart: "5pm",
      })
    ).toThrow()
  })

  it("summarizes first-party scheduling resources without raw secrets", () => {
    const resources: Resource[] = [
      {
        id: "policy",
        user_id: "user",
        type: "availability_policy",
        name: "Mina policy",
        config: {
          preferredDays: ["tuesday"],
          preferredStart: "17:00",
          preferredEnd: "19:00",
          defaultDurationMinutes: 30,
          bufferMinutes: 15,
          focusBlocks: [],
          workPreference: "After client review blocks.",
          socialPreference: "",
          notes: "Never reveal event names.",
        },
        created_at: "2026-05-10T00:00:00.000Z",
      },
      {
        id: "calendar",
        user_id: "user",
        type: "soft_hold_calendar",
        name: "Mochi soft holds",
        config: {
          timezone: "America/Los_Angeles",
          defaultDurationMinutes: 30,
          notes: "Tentative only.",
          upcomingSoftHolds: [
            {
              title: "Landing page review",
              start: "2026-05-12T18:00:00.000Z",
              end: "2026-05-12T18:30:00.000Z",
              status: "tentative",
            },
          ],
        },
        created_at: "2026-05-10T00:00:00.000Z",
      },
    ]

    const summary = summarizeResources(resources)

    expect(summary).toContain("Availability policy")
    expect(summary).toContain("AgentLink soft-hold calendar")
    expect(summary).toContain("Landing page review")
    expect(summary).not.toContain("access_token")
  })

  it("validates internal soft-hold tool inputs", () => {
    const tool = getProviderTool("internal.create_soft_hold")

    expect(tool?.isWrite).toBe(true)
    expect(() =>
      softHoldInputSchema.parse({
        resourceId: "00000000-0000-4000-8000-000000000000",
        title: "Landing page review",
        start: "2026-05-12T18:00:00.000Z",
        end: "2026-05-12T18:30:00.000Z",
      })
    ).not.toThrow()
    expect(() =>
      tool?.inputSchema.parse({
        resourceId: "not-a-resource",
        title: "",
        start: "not-a-date",
        end: "2026-05-12T18:30:00.000Z",
      })
    ).toThrow()
  })

  it("does not resolve unauthorized or unknown tool ids", () => {
    expect(getProviderTool("github.search_issues")?.isWrite).toBe(false)
    expect(getProviderTool("github.delete_repo")).toBeNull()
  })

  it("redacts sensitive tool audit inputs", () => {
    expect(
      sanitizeInput({
        access_token: "secret-token",
        query: "project status",
      })
    ).toEqual({
      access_token: "[redacted]",
      query: "project status",
    })
  })

  it("keeps demo Clod replies deterministic when Clod is not configured", async () => {
    vi.stubEnv("CLOD_ENDPOINT", "")
    vi.stubEnv("NODE_ENV", "test")

    try {
      const reply = await callClodAgent(
        buildTurnPrompt({
          purpose: "Schedule a hangout",
          messages: [],
          turnNumber: 3,
          speakerAgent: soraAgent,
          listenerAgent: lumoAgent,
        }),
        "system"
      )

      expect(reply.message).toContain("tentatively agreed")
      expect(reply.thinkIsTerminated).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

function makeAgent(id: string, name: string): Agent {
  return {
    id,
    user_id: `${id}-owner`,
    name,
    role: `${name} role`,
    system_prompt: `${name} system prompt`,
    avatar_url: null,
    is_public: true,
    created_at: "2026-05-10T00:00:00.000Z",
  }
}

function makeMessage({
  turnNumber,
  senderAgentId,
  content,
}: {
  turnNumber: number
  senderAgentId: string
  content: string
}): ConversationMessage {
  return {
    id: `message-${turnNumber}`,
    conversation_id: "conversation",
    sender_agent_id: senderAgentId,
    content,
    is_termination: false,
    termination_reason: null,
    turn_number: turnNumber,
    status: "completed",
    created_at: "2026-05-10T00:00:00.000Z",
  }
}
