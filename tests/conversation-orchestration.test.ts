import { describe, expect, it } from "vitest"
import { callClodAgent } from "@/lib/clod"
import { summarizeResources } from "@/lib/conversations/resource-summary"
import { buildTurnPrompt } from "@/lib/conversations/prompt-builder"
import { getProviderTool } from "@/lib/providers/registry"
import { availabilityPolicyConfigSchema, softHoldInputSchema } from "@/lib/resources/schemas"
import { sanitizeInput } from "@/lib/providers/tool-runner"
import {
  parseClodAgentResponse,
  resolveClodAgentResponse,
} from "@/lib/validators/clod-response"
import type { Resource } from "@/lib/types"

describe("conversation orchestration helpers", () => {
  it("builds an initial turn prompt", () => {
    const prompt = buildTurnPrompt({
      purpose: "Schedule a hangout",
      messages: [],
      turnNumber: 1,
    })

    expect(prompt).toContain("Purpose: Schedule a hangout")
    expect(prompt).toContain("No prior turns")
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
    const previousEndpoint = process.env.CLOD_ENDPOINT
    const previousNodeEnv = process.env.NODE_ENV

    delete process.env.CLOD_ENDPOINT
    process.env.NODE_ENV = "test"

    const reply = await callClodAgent("Turn #1\nTurn #2", "system")

    if (previousEndpoint) {
      process.env.CLOD_ENDPOINT = previousEndpoint
    } else {
      delete process.env.CLOD_ENDPOINT
    }
    process.env.NODE_ENV = previousNodeEnv

    expect(reply.message).toContain("tentatively agreed")
    expect(reply.thinkIsTerminated).toBe(false)
  })
})
