import { InfoIcon, SearchIcon } from "lucide-react"
import { sendFriendRequest } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function FriendSearch({ status }: { status?: string }) {
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
        {status ? (
          <p className="mb-4 rounded-2xl bg-secondary px-4 py-3 text-sm">{status}</p>
        ) : null}
        <form action={sendFriendRequest} className={status ? "border-t border-border/60 pt-4" : undefined}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="query" className="flex w-full items-center gap-2">
                Email or username
              </FieldLabel>
              <Input id="query" name="query" placeholder="hana@example.com" />
              <FieldDescription className="text-xs text-muted-foreground/75">
                Hackathon demo — try{" "}
                <span className="font-mono text-[11px] text-muted-foreground/90">
                  kizawaamon@gmail.com
                </span>{" "}
                .
              </FieldDescription>
            </Field>
            <Button type="submit">Send request</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
