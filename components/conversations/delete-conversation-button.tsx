"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Trash2Icon } from "lucide-react"
import { deleteConversation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DeleteConversationButton({
  conversationId,
  conversationPurpose,
  className,
}: {
  conversationId: string
  conversationPurpose: string
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 shrink-0 text-muted-foreground opacity-50 transition-[opacity,colors] hover:bg-destructive/10 hover:text-destructive hover:opacity-100 focus-visible:opacity-100"
        disabled={pending}
        title="Remove from history"
        aria-label={`Delete conversation: ${conversationPurpose}`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (
            !confirm(
              "Remove this conversation from history? It disappears for both participants. This cannot be undone."
            )
          ) {
            return
          }
          setError("")
          startTransition(async () => {
            const result = await deleteConversation(conversationId)
            if (!result.ok) {
              setError(result.error)
              return
            }
            router.refresh()
          })
        }}
      >
        <Trash2Icon className="size-3.5" aria-hidden />
      </Button>
      {error ? (
        <p className="max-w-[11rem] text-right text-[11px] leading-snug text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
