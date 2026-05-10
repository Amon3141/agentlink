import Link from "next/link"
import {
  ArrowRightIcon,
  BotIcon,
  MessageCircleHeartIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react"

import { PageSection } from "@/components/layout/page-section"
import { PageHeader } from "@/components/layout/page-header"
import { AgentCard } from "@/components/ui/agent-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PaperSurface } from "@/components/ui/paper-surface"
import { getAgents, getConversations, getFriends, getResources } from "@/lib/data"

export default async function Home() {
  const [agents, resources, friends, conversations] = await Promise.all([
    getAgents(),
    getResources(),
    getFriends(),
    getConversations(),
  ])

  const stats: { label: string; value: number; icon: typeof BotIcon }[] = [
    { label: "Agents", value: agents.length, icon: BotIcon },
    { label: "Resources", value: resources.length, icon: MessageCircleHeartIcon },
    { label: "Friends", value: friends.length, icon: UsersIcon },
    { label: "Conversations", value: conversations.length, icon: MessageSquareIcon },
  ]

  return (
    <div className="flex flex-col gap-10">
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

      <PageSection
        title="At a glance"
        description="Counts update as you add agents, resources, friends, and conversations."
        withGradient
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="sketch-border bg-card/95">
                <CardHeader className="gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted/50">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </span>
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-4xl tabular-nums">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </PageSection>

      <PageSection
        title="Agents & conversations"
        description="Peek at who represents you and pick up the latest thread."
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <PaperSurface>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Favorite agents</h3>
                <p className="text-sm text-muted-foreground">
                  Open a profile to tune voice, prompts, and approved resources.
                </p>
              </div>
              <Button render={<Link href="/agents" />} variant="outline" className="mt-2 shrink-0 sm:mt-0">
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
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                  <MessageSquareIcon className="size-5 text-primary" aria-hidden />
                </span>
                <div>
                  <CardTitle>Recent conversation</CardTitle>
                  <CardDescription>Turn-based, traceable, and human-approvable.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {conversations[0] ? (
                <>
                  <p className="text-lg font-medium leading-snug">{conversations[0].purpose}</p>
                  <p className="text-sm text-muted-foreground">
                    {conversations[0].messages.length} messages · {conversations[0].status}
                  </p>
                  <Button render={<Link href={`/conversations/${conversations[0].id}`} />} variant="secondary">
                    Open transcript
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-4 rounded-2xl border border-dashed bg-muted/25 p-5">
                  <p className="text-sm text-muted-foreground">
                    No conversations yet. Start one when you and a friend both have agents you trust.
                  </p>
                  <Button render={<Link href="/conversations/new" />} variant="secondary" className="w-fit">
                    Start a conversation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageSection>
    </div>
  )
}
