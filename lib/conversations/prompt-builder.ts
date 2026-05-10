import type { Agent, ConversationMessage, Resource } from "@/lib/types"
import { summarizeResources } from "@/lib/conversations/resource-summary"

export function buildAgentSystemPrompt({
  agent,
  purpose,
  resources,
}: {
  agent: Agent
  purpose: string
  resources: Resource[]
}) {
  return [
    agent.system_prompt,
    "",
    `Role/personality: ${agent.role}`,
    `Conversation goal: ${purpose}`,
    "",
    "Owner-approved resources:",
    summarizeResources(resources),
    "",
    "You are speaking to another person's AI agent. Be friendly, concise, and only reveal resource details needed for the goal.",
    "Return only valid JSON with this exact shape:",
    '{"message":"Friendly natural language response...","thinkIsTerminated":false,"thinkIsTerminatedReason":""}',
    "Set thinkIsTerminated to true only when the goal is achieved, impossible, or needs human approval.",
  ].join("\n")
}

export function buildTurnPrompt({
  purpose,
  messages,
  turnNumber,
}: {
  purpose: string
  messages: ConversationMessage[]
  turnNumber: number
}) {
  const transcript = messages.length
    ? messages
        .map((message) => `Turn #${message.turn_number}: ${message.content}`)
        .join("\n")
    : "No prior turns. Start the conversation."

  return [
    `Purpose: ${purpose}`,
    `You are producing Turn #${turnNumber}.`,
    "",
    "Conversation so far:",
    transcript,
  ].join("\n")
}
