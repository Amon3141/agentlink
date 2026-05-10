import { callClodAgent } from "@/lib/clod"
import { demoConversations } from "@/lib/demo-data"
import { buildAgentSystemPrompt, buildTurnPrompt } from "@/lib/conversations/prompt-builder"
import {
  executeApprovedTool,
  getApprovedToolSummaries,
  type ToolExecutionResponse,
} from "@/lib/providers/tool-runner"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Agent, ConversationMessage, ConversationTurnClaim, Resource } from "@/lib/types"

const maxToolCallsPerTurn = 2

export async function runNextConversationTurn(conversationId: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    const demo = demoConversations.find((item) => item.id === conversationId)
    return {
      status: demo?.status ?? "completed",
      message: demo?.messages.at(-1) ?? null,
    }
  }

  const { data: claimData, error: claimError } = await supabase.rpc(
    "claim_next_conversation_turn",
    { p_conversation_id: conversationId }
  )

  const claim = Array.isArray(claimData)
    ? (claimData[0] as ConversationTurnClaim | undefined)
    : (claimData as ConversationTurnClaim | null)

  if (claimError || !claim) {
    return { status: "failed", message: null }
  }

  if (claim.status !== "claimed") {
    return { status: claim.status, message: null }
  }

  if (!claim.message_id || !claim.sender_agent_id || !claim.turn_number) {
    return { status: "failed", message: null }
  }

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", conversationId).single(),
    supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "completed")
      .order("turn_number", { ascending: true }),
  ])

  if (!conversation || conversation.status !== "ongoing") {
    return { status: conversation?.status ?? "missing", message: null }
  }

  const history = (messages ?? []) as ConversationMessage[]
  const nextTurn = claim.turn_number
  const senderAgentId = claim.sender_agent_id

  const [{ data: agent }, { data: resources }] = await Promise.all([
    supabase.from("agents").select("*").eq("id", senderAgentId).single(),
    supabase
      .from("agent_resources")
      .select("resources(*)")
      .eq("agent_id", senderAgentId),
  ])

  if (!agent) {
    await supabase.rpc("fail_conversation_turn", {
      p_message_id: claim.message_id,
      p_reason: "The selected sender agent could not be loaded.",
    })
    await supabase.from("conversations").update({ status: "failed" }).eq("id", conversationId)
    return { status: "failed", message: null }
  }

  const agentResources = ((resources ?? [])
    .flatMap((row) => row.resources ?? [])
    .filter(Boolean) as unknown as Resource[])
  const [enrichedResources, approvedTools] = await Promise.all([
    attachSoftHoldSummaries(agentResources, (agent as Agent).user_id),
    getApprovedToolSummaries(senderAgentId, (agent as Agent).user_id),
  ])
  const systemPrompt = buildAgentSystemPrompt({
    agent: agent as Agent,
    purpose: conversation.purpose,
    resources: enrichedResources,
    tools: approvedTools,
  })
  const basePrompt = buildTurnPrompt({
    purpose: conversation.purpose,
    messages: history,
    turnNumber: nextTurn,
  })

  try {
    const response = await runClodToolLoop({
      prompt: basePrompt,
      systemPrompt,
      agent: agent as Agent,
      conversationId,
    })

    const { data: completed } = await supabase.rpc("complete_conversation_turn", {
      p_message_id: claim.message_id,
      p_content: response.message,
      p_is_termination: response.thinkIsTerminated,
      p_termination_reason: response.thinkIsTerminatedReason || "",
    })

    if (!completed) {
      await supabase.rpc("fail_conversation_turn", {
        p_message_id: claim.message_id,
        p_reason: "The turn was claimed but could not be saved.",
      })
      return { status: "failed", message: null }
    }

    const { data: inserted } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("id", claim.message_id)
      .single()

    return {
      status: response.thinkIsTerminated ? "completed" : "ongoing",
      message: inserted,
    }
  } catch (error) {
    await supabase.rpc("fail_conversation_turn", {
      p_message_id: claim.message_id,
      p_reason:
        error instanceof Error
          ? error.message
          : "The Clod request failed before a response could be saved.",
    })
    return { status: "failed", message: null }
  }
}

async function runClodToolLoop({
  prompt,
  systemPrompt,
  agent,
  conversationId,
}: {
  prompt: string
  systemPrompt: string
  agent: Agent
  conversationId: string
}) {
  let nextPrompt = prompt
  const toolResults: string[] = []

  for (let toolCallCount = 0; toolCallCount <= maxToolCallsPerTurn; toolCallCount += 1) {
    const response = await callClodAgent(nextPrompt, systemPrompt)

    if (!response.toolRequest) {
      return response
    }

    if (toolCallCount >= maxToolCallsPerTurn) {
      throw new Error("The agent requested too many online tool calls for one turn.")
    }

    const toolResult = await executeApprovedTool({
      agentId: agent.id,
      userId: agent.user_id,
      connectionId: response.toolRequest.connectionId,
      toolId: response.toolRequest.toolId,
      input: response.toolRequest.input,
      conversationId,
    })

    toolResults.push(formatToolResult(response.toolRequest.toolId, toolResult))
    nextPrompt = [
      prompt,
      "",
      "Online tool results so far:",
      toolResults.join("\n"),
      "",
      "Use these sanitized tool results to produce the final conversation message. If a tool failed or was denied, clearly explain what could not be verified and do not pretend the action succeeded.",
    ].join("\n")
  }

  throw new Error("The online tool loop ended unexpectedly.")
}

function formatToolResult(toolId: string, result: ToolExecutionResponse) {
  return JSON.stringify({
    toolId,
    status: result.status,
    summary: result.summary,
    result: result.result,
  })
}

async function attachSoftHoldSummaries(resources: Resource[], userId: string): Promise<Resource[]> {
  const calendarIds = resources
    .filter((resource) => resource.type === "soft_hold_calendar")
    .map((resource) => resource.id)

  if (calendarIds.length === 0) {
    return resources
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return resources
  }

  const windowStart = new Date()
  const windowEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const { data: holds } = await supabase
    .from("soft_holds")
    .select("resource_id,title,start_at,end_at,status,created_by")
    .eq("user_id", userId)
    .in("resource_id", calendarIds)
    .in("status", ["tentative", "confirmed"])
    .gte("end_at", windowStart.toISOString())
    .lte("start_at", windowEnd.toISOString())
    .order("start_at", { ascending: true })
    .limit(20)

  const holdsByResource = new Map<string, Record<string, unknown>[]>()
  for (const hold of holds ?? []) {
    const resourceId = String(hold.resource_id)
    const existing = holdsByResource.get(resourceId) ?? []
    existing.push({
      title: hold.title,
      start: hold.start_at,
      end: hold.end_at,
      status: hold.status,
      createdBy: hold.created_by,
    })
    holdsByResource.set(resourceId, existing)
  }

  return resources.map((resource) =>
    resource.type === "soft_hold_calendar"
      ? {
          ...resource,
          config: {
            ...resource.config,
            upcomingSoftHolds: holdsByResource.get(resource.id) ?? [],
          },
        }
      : resource
  )
}
