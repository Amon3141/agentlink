"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { OctagonMinusIcon } from "lucide-react"
import type { ConversationMessage, ConversationWithMessages, ToolCallAudit } from "@/lib/types"
import { stopConversation } from "@/lib/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ChatThread({
  conversation,
  toolAudits = [],
  viewerCanStopConversation = false,
}: {
  conversation: ConversationWithMessages
  toolAudits?: ToolCallAudit[]
  viewerCanStopConversation?: boolean
}) {
  const router = useRouter()
  const [isStopping, startStopTransition] = useTransition()
  const activeConversationRef = useRef(conversation.id)
  const [localConversation, setLocalConversation] = useState(conversation)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [pollError, setPollError] = useState("")
  const [stopError, setStopError] = useState("")

  useEffect(() => {
    activeConversationRef.current = conversation.id
    setLocalConversation(conversation)
  }, [conversation])

  useEffect(() => {
    if (localConversation.status !== "ongoing") {
      return
    }

    const controller = new AbortController()
    let cancelled = false

    async function advanceConversation() {
      setIsAdvancing(true)
      try {
        while (!cancelled && activeConversationRef.current === conversation.id) {
          await waitForVisible(controller.signal)

          const response = await fetch(`/api/conversations/${conversation.id}/next-turn`, {
            method: "POST",
            signal: controller.signal,
          })

          if (!response.ok) {
            setPollError("The next turn could not be advanced. Refresh or try again soon.")
            router.refresh()
            return
          }

          const result = (await response.json()) as NextTurnResponse
          setPollError("")
          const terminalStatus = getTerminalConversationStatus(result.status)

          if (result.message) {
            const message = result.message
            setLocalConversation((current) =>
              current.id === conversation.id
                ? mergeConversationTurn(current, message, terminalStatus)
                : current
            )
          } else if (terminalStatus) {
            setLocalConversation((current) =>
              current.id === conversation.id
                ? { ...current, status: terminalStatus }
                : current
            )
          }

          if (terminalStatus) {
            router.refresh()
            return
          }

          if (result.usedTools) {
            router.refresh()
          }

          await sleep(result.status === "in_progress" ? 1500 : 650, controller.signal)
        }
      } catch {
        if (!controller.signal.aborted) {
          setPollError("The next turn could not be advanced. Refresh or try again soon.")
        }
      } finally {
        if (!cancelled) {
          setIsAdvancing(false)
        }
      }
    }

    void advanceConversation()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [conversation.id, localConversation.status, router])

  const displayedConversation = localConversation

  const completedMessages = displayedConversation.messages.filter(
    (message) => message.status === "completed"
  )
  const awaitingFirstReply =
    displayedConversation.status === "ongoing" && completedMessages.length === 0
  const firstSpeakerAgent = displayedConversation.my_agent
  /** True before the effect runs after navigation, and while orchestration waits. */
  const showAgentThinking = awaitingFirstReply || isAdvancing

  return (
    <div className="flex flex-col gap-4">
      {awaitingFirstReply ? (
        <div className="flex gap-3 justify-start opacity-95">
          <AgentAvatar agent={firstSpeakerAgent} />
          <Card className="max-w-[78%] rounded-xl border-dashed bg-card/95 p-4 text-base">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-medium">{firstSpeakerAgent.name}</span>
              {viewerCanStopConversation ? (
                <Badge variant="secondary" className="text-[10px] font-normal uppercase">
                  Your agent
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground">
              {viewerCanStopConversation ? (
                <>Your agent is drafting the opening message.</>
              ) : (
                <>
                  <span className="font-medium text-foreground">{firstSpeakerAgent.name}</span> is drafting
                  the opening message.
                </>
              )}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-duration:950ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-duration:950ms] [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-duration:950ms] [animation-delay:300ms]" />
            </div>
          </Card>
        </div>
      ) : null}
      {displayedConversation.messages
        .filter((message) => message.status !== "pending")
        .map((message) => {
        const agent =
          message.sender_agent_id === displayedConversation.my_agent.id
            ? displayedConversation.my_agent
            : displayedConversation.friend_agent
        const mine = agent.id === displayedConversation.my_agent.id

        return (
          <div
            key={message.id}
            className={cn("flex gap-3", mine ? "justify-start" : "justify-end")}
          >
            {mine ? <AgentAvatar agent={agent} /> : null}
            <Card
              className={cn(
                "max-w-[78%] rounded-xl p-4 text-base",
                mine ? "bg-card/95" : "bg-secondary/95"
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium">{agent.name}</span>
              </div>
              <p className="leading-7">{message.content}</p>
              {message.termination_reason ? (
                <p className="mt-3 rounded-xl bg-accent p-3 text-sm">
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
      {displayedConversation.status === "ongoing" ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="size-2 animate-bounce rounded-full bg-primary" />
              <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />
              <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
              {showAgentThinking ? "An agent is thinking..." : "Waiting for the next turn..."}
            </div>
            {viewerCanStopConversation ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 gap-2"
                disabled={isStopping}
                onClick={() => {
                  setStopError("")
                  startStopTransition(async () => {
                    const result = await stopConversation(conversation.id)
                    if (!result.ok) {
                      setStopError(result.error)
                      return
                    }
                    router.refresh()
                  })
                }}
              >
                <OctagonMinusIcon className="size-4" aria-hidden />
                {isStopping ? "Stopping…" : "Stop conversation"}
              </Button>
            ) : null}
          </div>
          {viewerCanStopConversation ? (
            <p className="text-xs leading-relaxed">
              Ends the thread for both agents and clears any in-progress turn. Your friend&apos;s view
              updates on refresh.
            </p>
          ) : null}
        </div>
      ) : null}
      {stopError ? (
        <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{stopError}</p>
      ) : null}
      {pollError ? (
        <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
          {pollError}
        </p>
      ) : null}
    </div>
  )
}

type NextTurnResponse = {
  status: "claimed" | "in_progress" | "ongoing" | "completed" | "failed" | "missing"
  message: ConversationMessage | null
  usedTools?: boolean
}

function mergeConversationTurn(
  conversation: ConversationWithMessages,
  message: ConversationMessage,
  terminalStatus: ConversationWithMessages["status"] | null
): ConversationWithMessages {
  const messages = conversation.messages
    .filter((item) => item.id !== message.id)
    .concat(message)
    .sort((a, b) => a.turn_number - b.turn_number)

  const resolvedStatus: ConversationWithMessages["status"] =
    terminalStatus ??
    (message.is_termination ? "completed" : "ongoing")

  return {
    ...conversation,
    status: resolvedStatus,
    messages,
  }
}

function getTerminalConversationStatus(
  status: NextTurnResponse["status"]
): ConversationWithMessages["status"] | null {
  if (status === "completed" || status === "failed") {
    return status
  }
  if (status === "missing") {
    return "failed"
  }
  return null
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }

    const timeout = window.setTimeout(resolve, ms)
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true }
    )
  })
}

function waitForVisible(signal: AbortSignal) {
  if (document.visibilityState === "visible") {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }

    function cleanup() {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      signal.removeEventListener("abort", onAbort)
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        cleanup()
        resolve()
      }
    }

    function onAbort() {
      cleanup()
      reject(new DOMException("Aborted", "AbortError"))
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    signal.addEventListener("abort", onAbort, { once: true })
  })
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
