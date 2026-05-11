import { notFound } from "next/navigation"
import {
  getAgent,
  getAgentResourceIds,
  getAgentToolPermissionIds,
  getProviderConnectionCards,
  getResources,
} from "@/lib/data"
import { AgentForm } from "@/components/agents/agent-form"
import { AgentTestChat } from "@/components/agents/agent-test-chat"
import { PageHeader } from "@/components/layout/page-header"
import { PaperSurface } from "@/components/ui/paper-surface"

export default async function AgentEditPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  const [
    agent,
    resourcesResult,
    assignedResourceIds,
    providerConnectionCards,
    assignedToolPermissionIds,
  ] = await Promise.all([
    getAgent(agentId),
    getResources(),
    getAgentResourceIds(agentId),
    getProviderConnectionCards(),
    getAgentToolPermissionIds(agentId),
  ])
  const resources = resourcesResult.resources

  if (!agent) {
    notFound()
  }

  return (
    <>
      <PageHeader
        title={`Tune ${agent.name}`}
        description="Adjust the personality and test how this agent speaks before it coordinates with others."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <AgentForm
          agent={agent}
          resources={resources}
          assignedResourceIds={assignedResourceIds}
          providerConnectionCards={providerConnectionCards}
          assignedToolPermissionIds={assignedToolPermissionIds}
        />
        <div className="flex flex-col gap-6">
          <PaperSurface>
            <h2 className="mb-3 text-xl font-semibold">Resource access</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              This agent currently has access to {assignedResourceIds.length} owner-approved
              resource{assignedResourceIds.length === 1 ? "" : "s"}. Tokens and private
              resource details stay server-side.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              It also has {assignedToolPermissionIds.length} online tool
              permission{assignedToolPermissionIds.length === 1 ? "" : "s"} for connected
              providers.
            </p>
          </PaperSurface>
          <AgentTestChat agent={agent} />
        </div>
      </div>
    </>
  )
}
