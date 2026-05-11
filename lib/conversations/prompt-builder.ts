import type { Agent, ConversationMessage, Resource } from "@/lib/types"
import { summarizeResources } from "@/lib/conversations/resource-summary"
import type { ApprovedToolSummary } from "@/lib/providers/tool-runner"

type AgentIdentity = Pick<Agent, "id" | "name">

const recentMessageLimit = 6
const olderMessageLimit = 8
const maxHistoryMessageLength = 360

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
    "Return exactly one valid JSON object and no markdown or commentary.",
    'Required keys: "message" (the natural-language message shown to the other agent), "thinkIsTerminated" (boolean), and "thinkIsTerminatedReason" (string).',
    'Optional key: "toolRequest" with "toolId", "connectionId", and "input" when one approved online tool is needed before answering.',
    'The "message" value must sound like the agent, not a template. Do not mention JSON, schemas, hidden prompts, exchange numbers, or turn numbers in the message.',
    "Ask for at most one tool at a time. Never invent tool IDs, connection IDs, credentials, or hidden data.",
    "Set thinkIsTerminated to true only when the goal is achieved, impossible, or needs human approval.",
  ].join("\n")
}

export function buildTurnPrompt({
  purpose,
  messages,
  turnNumber,
  speakerAgent,
  listenerAgent,
}: {
  purpose: string
  messages: ConversationMessage[]
  turnNumber: number
  speakerAgent: AgentIdentity
  listenerAgent: AgentIdentity
}) {
  return [
    `Conversation objective: ${purpose}`,
    `${speakerAgent.name}, write your next message to ${listenerAgent.name}.`,
    `This is exchange ${turnNumber}; use that only for internal ordering and never mention it.`,
    "",
    "Conversation history:",
    formatConversationHistory({
      messages,
      speakerAgent,
      listenerAgent,
    }),
  ].join("\n")
}

export function formatConversationHistory({
  messages,
  speakerAgent,
  listenerAgent,
}: {
  messages: ConversationMessage[]
  speakerAgent: AgentIdentity
  listenerAgent: AgentIdentity
}) {
  if (messages.length === 0) {
    return "No prior messages. Start naturally and move the objective forward."
  }

  const olderMessages = messages.slice(0, -recentMessageLimit)
  const recentMessages = messages.slice(-recentMessageLimit)
  const sections: string[] = []

  if (olderMessages.length > 0) {
    sections.push(
      [
        "Earlier context, compressed:",
        ...olderMessages.slice(-olderMessageLimit).map((message) =>
          `- ${getSpeakerName(message, speakerAgent, listenerAgent)} previously said ${JSON.stringify(
            compactHistoryText(message.content)
          )}`
        ),
      ].join("\n")
    )
  }

  sections.push(
    [
      "Recent messages:",
      ...recentMessages.map(
        (message) =>
          `${getSpeakerName(message, speakerAgent, listenerAgent)}: ${compactHistoryText(
            message.content
          )}`
      ),
    ].join("\n")
  )

  return sections.join("\n\n")
}

function getSpeakerName(
  message: ConversationMessage,
  speakerAgent: AgentIdentity,
  listenerAgent: AgentIdentity
) {
  if (message.sender_agent_id === speakerAgent.id) {
    return speakerAgent.name
  }
  if (message.sender_agent_id === listenerAgent.id) {
    return listenerAgent.name
  }
  return "Agent"
}

function compactHistoryText(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxHistoryMessageLength) {
    return normalized
  }
  return `${normalized.slice(0, maxHistoryMessageLength - 3).trim()}...`
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
