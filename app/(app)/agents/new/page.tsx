import { AgentForm } from "@/components/agents/agent-form"
import { PageHeader } from "@/components/layout/page-header"
import { getProviderConnectionCards, getResources } from "@/lib/data"

export default async function NewAgentPage() {
  const [{ resources }, providerConnectionCards] = await Promise.all([
    getResources(),
    getProviderConnectionCards(),
  ])

  return (
    <>
      <PageHeader
        title="Create a new agent"
        description="Start with one clear job, a warm voice, and owner-approved resources."
      />
      <AgentForm resources={resources} providerConnectionCards={providerConnectionCards} />
    </>
  )
}
