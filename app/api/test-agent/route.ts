import { NextResponse, type NextRequest } from "next/server"
import { callClodAgent } from "@/lib/clod"
import { buildAgentSystemPrompt } from "@/lib/conversations/prompt-builder"
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server"
import type { Agent, Resource } from "@/lib/types"

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const { agentId, input } = (await request.json()) as {
    agentId: string
    input: string
  }

  if (!supabase || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [{ data: agent }, { data: resources }] = await Promise.all([
    supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("agent_resources")
      .select("resources(*)")
      .eq("agent_id", agentId),
  ])

  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 })
  }

  const systemPrompt = buildAgentSystemPrompt({
    agent: agent as Agent,
    purpose: "Single-agent test chat",
    resources: ((resources ?? [])
      .flatMap((row) => row.resources ?? [])
      .filter(Boolean) as unknown as Resource[]),
  })

  try {
    const result = await callClodAgent(input, systemPrompt)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The Clod request failed.",
      },
      { status: 502 }
    )
  }
}
