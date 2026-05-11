import Link from "next/link"
import type { ReactNode } from "react"

import type { ConversationWithMessages } from "@/lib/types"
import { DeleteConversationButton } from "@/components/conversations/delete-conversation-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ConversationList({
  conversations,
  empty,
}: {
  conversations: ConversationWithMessages[]
  empty?: ReactNode
}) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/25 px-5 py-6 text-sm text-muted-foreground">
        {empty ?? <p>Nothing to show yet.</p>}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className="sketch-border bg-card/95 transition-transform hover:-rotate-[0.35deg] hover:scale-[1.01]"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Link
                href={`/conversations/${conversation.id}`}
                className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 rounded-lg"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <CardTitle className="leading-snug">{conversation.purpose}</CardTitle>
                    <CardDescription>
                      {conversation.my_agent.name} ↔ {conversation.friend_agent.name}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={conversation.status === "ongoing" ? "secondary" : "outline"}
                    className="shrink-0 sm:mt-0.5"
                  >
                    {conversation.status}
                  </Badge>
                </div>
              </Link>
              <DeleteConversationButton
                conversationId={conversation.id}
                conversationPurpose={conversation.purpose}
                className="-mt-1"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            <Link href={`/conversations/${conversation.id}`} className="block rounded-lg outline-none hover:text-foreground/90">
              {conversation.messages.filter((m) => m.status === "completed").length} turns recorded — open transcript
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
