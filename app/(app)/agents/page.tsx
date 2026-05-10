import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { getAgents } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { AgentCard } from "@/components/ui/agent-card"
import { PageHeader } from "@/components/layout/page-header"

export default async function AgentsPage() {
  const agents = await getAgents()

  return (
    <>
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
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} href={`/agents/${agent.id}`} />
        ))}
      </div>
    </>
  )
}
