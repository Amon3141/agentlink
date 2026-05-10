import Link from "next/link"
import type { ReactNode } from "react"

import type { ConversationWithMessages } from "@/lib/types"
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
        <Link key={conversation.id} href={`/conversations/${conversation.id}`}>
          <Card className="sketch-border bg-card/95 transition-transform hover:-rotate-[0.35deg] hover:scale-[1.01]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="leading-snug">{conversation.purpose}</CardTitle>
                  <CardDescription>
                    {conversation.my_agent.name} ↔ {conversation.friend_agent.name}
                  </CardDescription>
                </div>
                <Badge variant={conversation.status === "ongoing" ? "secondary" : "outline"} className="shrink-0">
                  {conversation.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {conversation.messages.length} turns recorded
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
