import type { Friend } from "@/lib/types"
import { acceptFriendRequest, rejectFriendRequest } from "@/lib/actions"
import { AgentCard } from "@/components/ui/agent-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

export function FriendRequests({ friends }: { friends: Friend[] }) {
  const incoming = friends.filter(
    (friend) => friend.status === "pending" && friend.direction === "incoming"
  )
  const outgoing = friends.filter(
    (friend) => friend.status === "pending" && friend.direction === "outgoing"
  )
  const accepted = friends.filter((friend) => friend.status === "accepted")

  return (
    <div className="grid gap-5">
      <FriendSection title="Incoming requests" friends={incoming} empty="No one is waiting on you right now." />
      <FriendSection title="Outgoing requests" friends={outgoing} empty="No sent requests are pending." />
      <FriendSection title="Accepted friends" friends={accepted} empty="Add a friend to see their public agents here." />
    </div>
  )
}

function FriendSection({
  title,
  friends,
  empty,
}: {
  title: string
  friends: Friend[]
  empty: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {friends.length > 0 ? (
        friends.map((friend) => <FriendCard key={friend.id} friend={friend} />)
      ) : (
        <Empty className="bg-card/80">
          <EmptyHeader>
            <EmptyTitle>{empty}</EmptyTitle>
            <EmptyDescription>
              AgentLink will keep this list tidy as requests change.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  )
}

function FriendCard({ friend }: { friend: Friend }) {
  const initials = friend.profile.username.slice(0, 2).toUpperCase()

  return (
    <Card className="sketch-border bg-card/95">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarImage src={friend.profile.avatar_url ?? undefined} alt={friend.profile.username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{friend.profile.username}</CardTitle>
            <CardDescription>{friend.profile.email}</CardDescription>
          </div>
          <Badge className="ml-auto" variant={friend.status === "accepted" ? "secondary" : "outline"}>
            {friend.direction} {friend.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {friend.status === "pending" && friend.direction === "incoming" ? (
          <div className="flex gap-2">
            <form action={acceptFriendRequest}>
              <input type="hidden" name="friendRowId" value={friend.id} />
              <Button type="submit" size="sm">Accept</Button>
            </form>
            <form action={rejectFriendRequest}>
              <input type="hidden" name="friendRowId" value={friend.id} />
              <Button type="submit" size="sm" variant="outline">Reject</Button>
            </form>
          </div>
        ) : null}
        {friend.status === "pending" && friend.direction === "outgoing" ? (
          <form action={rejectFriendRequest}>
            <input type="hidden" name="friendRowId" value={friend.id} />
            <Button type="submit" size="sm" variant="outline">Cancel request</Button>
          </form>
        ) : null}
        {friend.status === "accepted" ? (
          <>
            <h3 className="text-sm font-medium">Public agents</h3>
            {friend.public_agents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {friend.public_agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} compact />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This friend has not shared a public agent yet.
              </p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
