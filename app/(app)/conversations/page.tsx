import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { getConversations } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { ConversationList } from "@/components/conversations/conversation-list"
import { PageHeader } from "@/components/layout/page-header"

export default async function ConversationsPage() {
  const conversations = await getConversations()
  const ongoing = conversations.filter((conversation) => conversation.status === "ongoing")
  const completed = conversations.filter((conversation) => conversation.status !== "ongoing")

  return (
    <>
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
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Ongoing</h2>
        <ConversationList conversations={ongoing} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Completed history</h2>
        <ConversationList conversations={completed} />
      </section>
    </>
  )
}
