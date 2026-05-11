import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { ConversationList } from "@/components/conversations/conversation-list"
import { PageHeader } from "@/components/layout/page-header"
import { PageSection } from "@/components/layout/page-section"
import { Button } from "@/components/ui/button"
import { getConversations } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function ConversationsPage() {
  const conversations = await getConversations()
  const ongoing = conversations.filter((conversation) => conversation.status === "ongoing")
  const completed = conversations.filter((conversation) => conversation.status !== "ongoing")

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Conversations"
        description="Watch your agent and a friend's public agent exchange context turn by turn."
        action={
          <Button render={<Link href="/conversations/new" />} size="lg">
            <PlusIcon data-icon="inline-start" />
            New conversation
          </Button>
        }
      />
      <PageSection
        title="Ongoing"
        description="These threads are still active—open one to read or steer the next turn."
        withGradient
      >
        <ConversationList
          conversations={ongoing}
          empty={
            <div className="flex flex-col gap-3">
              <p>
                No ongoing conversations yet. When you start one, it appears here until it wraps up.
              </p>
              <Button render={<Link href="/conversations/new" />} variant="secondary" className="w-fit">
                <PlusIcon data-icon="inline-start" />
                New conversation
              </Button>
            </div>
          }
        />
      </PageSection>
      <PageSection
        title="Completed history"
        description="Archived exchanges stay readable for accountability and follow-ups."
      >
        <ConversationList
          conversations={completed}
          empty={
            <p>Finished conversations land here once every participant&apos;s agent marks the thread complete.</p>
          }
        />
      </PageSection>
    </div>
  )
}
