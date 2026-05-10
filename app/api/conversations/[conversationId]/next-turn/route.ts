import { NextResponse, type NextRequest } from "next/server"
import { runNextConversationTurn } from "@/lib/conversations/orchestrator"
import { getCurrentUserId } from "@/lib/supabase/server"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { conversationId } = await params
  const result = await runNextConversationTurn(conversationId)
  const status = result.status === "missing" ? 404 : 200
  return NextResponse.json(result, { status })
}
