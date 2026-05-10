import { SearchIcon } from "lucide-react"
import { sendFriendRequest } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function FriendSearch({ status }: { status?: string }) {
  return (
    <Card className="sketch-border bg-card/95">
      <CardHeader>
        <SearchIcon />
        <CardTitle>Find a friend</CardTitle>
        <CardDescription>Search by email or username and send a request.</CardDescription>
      </CardHeader>
      <CardContent>
        {status ? (
          <p className="mb-4 rounded-2xl bg-secondary p-3 text-sm">{status}</p>
        ) : null}
        <form action={sendFriendRequest}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="query">Email or username</FieldLabel>
              <Input id="query" name="query" placeholder="hana@example.com" />
            </Field>
            <Button type="submit">Send request</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
