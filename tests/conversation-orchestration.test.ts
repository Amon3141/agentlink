import { describe, expect, it } from "vitest"
import { callClodAgent } from "@/lib/clod"
import { buildTurnPrompt } from "@/lib/conversations/prompt-builder"
import { parseClodAgentResponse } from "@/lib/validators/clod-response"

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

  it("rejects malformed Clod JSON", () => {
    expect(() => parseClodAgentResponse("{ nope")).toThrow("invalid JSON")
    expect(() =>
      parseClodAgentResponse({
        message: "Missing termination flag.",
      })
    ).toThrow("malformed JSON")
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
