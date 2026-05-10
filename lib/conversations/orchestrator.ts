import { callClodAgent } from "@/lib/clod"
import { demoConversations } from "@/lib/demo-data"
import { buildAgentSystemPrompt, buildTurnPrompt } from "@/lib/conversations/prompt-builder"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Agent, ConversationMessage, ConversationTurnClaim, Resource } from "@/lib/types"

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

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single()

  if (!conversation || conversation.status !== "ongoing") {
    return { status: conversation?.status ?? "missing", message: null }
  }

  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "completed")
    .order("turn_number", { ascending: true })

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

  const systemPrompt = buildAgentSystemPrompt({
    agent: agent as Agent,
    purpose: conversation.purpose,
    resources: agentResources,
  })
  const prompt = buildTurnPrompt({
    purpose: conversation.purpose,
    messages: history,
    turnNumber: nextTurn,
  })

  try {
    const response = await callClodAgent(prompt, systemPrompt)

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
