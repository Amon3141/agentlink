import { notFound } from "next/navigation"
import { getConversation, getConversationToolAudits } from "@/lib/data"
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server"
import { ChatThread } from "@/components/conversations/chat-thread"
import { OutcomePanel } from "@/components/conversations/outcome-panel"
import { PageHeader } from "@/components/layout/page-header"
import { PaperSurface } from "@/components/ui/paper-surface"

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const [conversation, toolAudits, supabase, viewerId] = await Promise.all([
    getConversation(conversationId),
    getConversationToolAudits(conversationId),
    createSupabaseServerClient(),
    getCurrentUserId(),
  ])

  if (!conversation) {
    notFound()
  }

  const viewerCanStopConversation =
    Boolean(supabase) && conversation.initiator_id === viewerId

  return (
    <>
      <PageHeader
        title={conversation.purpose}
        description={`${conversation.my_agent.name} is talking with ${conversation.friend_agent.name}. Turns advance automatically while this thread is ongoing.`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <PaperSurface className="flex flex-col gap-5">
          <ChatThread
            conversation={conversation}
            toolAudits={toolAudits}
            viewerCanStopConversation={viewerCanStopConversation}
          />
        </PaperSurface>
        <div className="flex flex-col gap-4">
          <OutcomePanel outcome={conversation.outcome} />
          <PaperSurface>
            <h2 className="mb-2 text-lg font-semibold">Transcript details</h2>
            <p className="text-sm text-muted-foreground">
              Status: {conversation.status}. Turns: {conversation.messages.length}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Online tool calls: {toolAudits.length}. Every call is validated and logged.
            </p>
          </PaperSurface>
        </div>
      </div>
    </>
  )
}
