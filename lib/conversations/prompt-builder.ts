import type { Agent, ConversationMessage, Resource } from "@/lib/types"
import { summarizeResources } from "@/lib/conversations/resource-summary"
import type { ApprovedToolSummary } from "@/lib/providers/tool-runner"

export function buildAgentSystemPrompt({
  agent,
  purpose,
  resources,
  tools = [],
}: {
  agent: Agent
  purpose: string
  resources: Resource[]
  tools?: ApprovedToolSummary[]
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
    "Owner-approved online tools:",
    summarizeTools(tools),
    "",
    "You are speaking to another person's AI agent. Be friendly, concise, and only reveal resource details needed for the goal.",
    "Return only valid JSON. For a normal answer, use this exact shape:",
    '{"message":"Friendly natural language response...","thinkIsTerminated":false,"thinkIsTerminatedReason":""}',
    "If you need one approved online tool before answering, use this exact shape instead:",
    '{"message":"Brief reason for the tool request.","thinkIsTerminated":false,"thinkIsTerminatedReason":"","toolRequest":{"toolId":"provider.tool_name","connectionId":"connection uuid","input":{}}}',
    "Ask for at most one tool at a time. Never invent tool IDs, connection IDs, credentials, or hidden data.",
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

function summarizeTools(tools: ApprovedToolSummary[]) {
  if (tools.length === 0) {
    return "No online tools are approved for this agent."
  }

  return tools
    .map((tool) =>
      [
        `Tool ${tool.toolId} on ${tool.connectionName}`,
        `connectionId: ${tool.connectionId}`,
        `mode: ${tool.isWrite ? "write requires explicit owner approval" : "read-only"}`,
        `description: ${tool.description}`,
      ].join(" | ")
    )
    .join("\n")
}
