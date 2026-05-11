"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { sendFriendRequest } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function FriendSearch({ status }: { status?: string }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(sendFriendRequest, null)

  useEffect(() => {
    if (state?.success) {
      router.refresh()
    }
  }, [state?.success, router])

  const message = state?.message ?? status ?? ""
  const showBanner = Boolean(message)
  const bannerClass = state && !state.success ? "bg-destructive/10" : "bg-secondary"

  return (
    <Card className="sketch-border bg-card/95">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50">
            <SearchIcon className="size-5 text-primary" aria-hidden />
          </span>
          <div>
            <CardTitle>Find a friend</CardTitle>
            <CardDescription>Search by email or username and send a request.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showBanner ? (
          <p className={`mb-4 rounded-2xl px-4 py-3 text-sm ${bannerClass}`}>{message}</p>
        ) : null}
        <form
          action={formAction}
          className={showBanner ? "border-t border-border/60 pt-4" : undefined}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="query" className="flex w-full items-center gap-2">
                Email or username
              </FieldLabel>
              <Input id="query" name="query" placeholder="hana@example.com" disabled={isPending} />
              <FieldDescription className="text-xs text-muted-foreground/75">
                Hackathon demo — try{" "}
                <span className="font-mono text-[11px] text-muted-foreground/90">
                  kizawaamon@gmail.com
                </span>{" "}
                .
              </FieldDescription>
            </Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending…" : "Send request"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
