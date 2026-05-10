import Link from "next/link"
import type { ConversationWithMessages } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ConversationList({
  conversations,
}: {
  conversations: ConversationWithMessages[]
}) {
  return (
    <div className="grid gap-4">
      {conversations.map((conversation) => (
        <Link key={conversation.id} href={`/conversations/${conversation.id}`}>
          <Card className="bg-card/92 transition-transform hover:-rotate-1 hover:scale-[1.01]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{conversation.purpose}</CardTitle>
                  <CardDescription>
                    {conversation.my_agent.name} ↔ {conversation.friend_agent.name}
                  </CardDescription>
                </div>
                <Badge variant={conversation.status === "ongoing" ? "secondary" : "outline"}>
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
