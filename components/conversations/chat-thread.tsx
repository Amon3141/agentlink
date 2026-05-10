"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { ConversationWithMessages, ToolCallAudit } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ChatThread({
  conversation,
  toolAudits = [],
}: {
  conversation: ConversationWithMessages
  toolAudits?: ToolCallAudit[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const inFlightRef = useRef(false)
  const [pollError, setPollError] = useState("")

  useEffect(() => {
    if (conversation.status !== "ongoing") {
      return
    }

    const timer = window.setInterval(() => {
      if (inFlightRef.current || document.visibilityState === "hidden") {
        return
      }

      inFlightRef.current = true
      startTransition(async () => {
        try {
          const response = await fetch(`/api/conversations/${conversation.id}/next-turn`, {
            method: "POST",
          })
          if (!response.ok) {
            setPollError("The next turn could not be advanced. Refresh or try again soon.")
          } else {
            setPollError("")
          }
          router.refresh()
        } finally {
          inFlightRef.current = false
        }
      })
    }, 2500)

    return () => window.clearInterval(timer)
  }, [conversation.id, conversation.status, router])

  return (
    <div className="flex flex-col gap-4">
      {conversation.messages.map((message) => {
        const agent =
          message.sender_agent_id === conversation.my_agent.id
            ? conversation.my_agent
            : conversation.friend_agent
        const mine = agent.id === conversation.my_agent.id

        return (
          <div
            key={message.id}
            className={cn("flex gap-3", mine ? "justify-start" : "justify-end")}
          >
            {mine ? <AgentAvatar agent={agent} /> : null}
            <Card
              className={cn(
                "max-w-[78%] rounded-3xl p-4",
                mine ? "bg-card/95" : "bg-secondary/95"
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium">{agent.name}</span>
                <Badge variant="outline">Turn {message.turn_number}</Badge>
              </div>
              <p className="text-sm leading-6">{message.content}</p>
              {message.termination_reason ? (
                <p className="mt-3 rounded-2xl bg-accent p-3 text-xs">
                  {message.termination_reason}
                </p>
              ) : null}
            </Card>
            {!mine ? <AgentAvatar agent={agent} /> : null}
          </div>
        )
      })}
      {toolAudits.length > 0 ? (
        <div className="rounded-2xl border bg-muted/50 p-4 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Online tool audit</p>
          <div className="flex flex-col gap-2">
            {toolAudits.map((audit) => (
              <div key={audit.id} className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{audit.status}</Badge>
                <span>{audit.provider}</span>
                <span>{audit.tool_id}</span>
                {typeof audit.result_summary.summary === "string" ? (
                  <span>{audit.result_summary.summary}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {conversation.status === "ongoing" ? (
        <div className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          <span className="size-2 animate-bounce rounded-full bg-primary" />
          <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />
          <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
          {isPending ? "An agent is thinking..." : "Waiting for the next turn..."}
        </div>
      ) : null}
      {pollError ? (
        <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
          {pollError}
        </p>
      ) : null}
    </div>
  )
}

function AgentAvatar({
  agent,
}: {
  agent: ConversationWithMessages["my_agent"]
}) {
  return (
    <Avatar className="size-12 rounded-2xl border bg-accent">
      <AvatarImage src={agent.avatar_url ?? undefined} alt={agent.name} />
      <AvatarFallback className="rounded-2xl">{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}
