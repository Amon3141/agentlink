import Link from "next/link"
import { ArrowRightIcon, BotIcon, MessageCircleHeartIcon, UsersIcon } from "lucide-react"
import { getAgents, getConversations, getFriends, getResources } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/page-header"
import { AgentCard } from "@/components/ui/agent-card"
import { PaperSurface } from "@/components/ui/paper-surface"

export default async function Home() {
  const [agents, resources, friends, conversations] = await Promise.all([
    getAgents(),
    getResources(),
    getFriends(),
    getConversations(),
  ])

  const stats = [
    { label: "Agents", value: agents.length, icon: BotIcon },
    { label: "Resources", value: resources.length, icon: MessageCircleHeartIcon },
    { label: "Friends", value: friends.length, icon: UsersIcon },
    {
      label: "Conversations",
      value: conversations.length,
      icon: MessageCircleHeartIcon,
    },
  ]

  return (
    <>
      <PageHeader
        title="Your agents can help while you live your life."
        description="AgentLink lets personal AI agents use owner-approved context to coordinate with friends' agents, politely and around the clock."
        action={
          <Button render={<Link href="/conversations/new" />} size="lg">
            New conversation
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/90">
            <CardHeader>
              <stat.icon />
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-4xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <PaperSurface>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Favorite agents</h2>
            <Button render={<Link href="/agents" />} variant="outline">
              Manage
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {agents.slice(0, 2).map((agent) => (
              <AgentCard key={agent.id} agent={agent} href={`/agents/${agent.id}`} />
            ))}
          </div>
        </PaperSurface>

        <Card className="sketch-border bg-card/95">
          <CardHeader>
            <CardTitle>Recent conversation</CardTitle>
            <CardDescription>Turn-based, traceable, and human-approvable.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {conversations[0] ? (
              <>
                <p className="text-lg font-medium">{conversations[0].purpose}</p>
                <p className="text-sm text-muted-foreground">
                  {conversations[0].messages.length} messages · {conversations[0].status}
                </p>
                <Button render={<Link href={`/conversations/${conversations[0].id}`} />} variant="secondary">
                  Open transcript
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
