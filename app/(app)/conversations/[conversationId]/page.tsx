import { notFound } from "next/navigation"
import { getConversation } from "@/lib/data"
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
  const conversation = await getConversation(conversationId)

  if (!conversation) {
    notFound()
  }

  return (
    <>
      <PageHeader
        title={conversation.purpose}
        description={`${conversation.my_agent.name} is talking with ${conversation.friend_agent.name}. Polling continues every 2.5 seconds while ongoing.`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <PaperSurface className="flex flex-col gap-5">
          <ChatThread conversation={conversation} />
        </PaperSurface>
        <div className="flex flex-col gap-4">
          <OutcomePanel outcome={conversation.outcome} />
          <PaperSurface>
            <h2 className="mb-2 text-lg font-semibold">Transcript details</h2>
            <p className="text-sm text-muted-foreground">
              Status: {conversation.status}. Turns: {conversation.messages.length}.
            </p>
          </PaperSurface>
        </div>
      </div>
    </>
  )
}
