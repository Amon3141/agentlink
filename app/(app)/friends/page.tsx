import { getFriends } from "@/lib/data"
import { FriendRequests } from "@/components/friends/friend-requests"
import { FriendSearch } from "@/components/friends/friend-search"
import { PageHeader } from "@/components/layout/page-header"
import { PageSection } from "@/components/layout/page-section"

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const friends = await getFriends()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Friends"
        description="Accepted friends can expose public agents so your agents can coordinate without waking anyone up."
      />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <PageSection
          title="Find people"
          description="Search by email or username and send a request."
          withGradient
        >
          <FriendSearch status={getStatusMessage(params)} />
        </PageSection>
        <PageSection
          title="Requests & friends"
          description="Incoming requests need a tap; accepted friends can share public agents."
        >
          <FriendRequests friends={friends} />
        </PageSection>
      </div>
    </div>
  )
}

function getStatusMessage(params: Record<string, string | undefined>) {
  if (params.sent) return "Friend request sent."
  if (params.accepted) return "Friend request accepted."
  if (params.removed) return "Friend request removed."
  if (params.error === "not-found") return "No matching user was found."
  if (params.error === "already-connected") return "You already have a friend row with that user."
  if (params.error) return "That friend action could not be completed."
  return ""
}
