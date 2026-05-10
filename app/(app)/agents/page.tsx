import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { PageSection } from "@/components/layout/page-section"
import { AgentCard } from "@/components/ui/agent-card"
import { Button } from "@/components/ui/button"
import { getAgents } from "@/lib/data"

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="My agents"
        description="Create multiple companions with different personalities, prompts, and resource access."
        action={
          <Button render={<Link href="/agents/new" />} size="lg">
            <PlusIcon data-icon="inline-start" />
            New agent
          </Button>
        }
      />
      <PageSection
        title="Your agents"
        description="Each card opens the editor for prompts, tools, and approved context."
        withGradient
      >
        {agents.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} href={`/agents/${agent.id}`} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-dashed bg-muted/25 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-sm text-muted-foreground">
              You have not created an agent yet. Add one to give AgentLink a voice, job description, and
              resource access.
            </p>
            <Button render={<Link href="/agents/new" />} size="lg" className="shrink-0 gap-2 sketch-border">
              <PlusIcon data-icon="inline-start" />
              New agent
            </Button>
          </div>
        )}
      </PageSection>
    </div>
  )
}
