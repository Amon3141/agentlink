import { getProviderConnectionCards, getResources, getSoftHolds } from "@/lib/data"
import { PageHeader } from "@/components/layout/page-header"
import { ResourceBoard } from "@/components/resources/resource-board"

export default async function ResourcesPage() {
  const [resources, providerCards, softHolds] = await Promise.all([
    getResources(),
    getProviderConnectionCards(),
    getSoftHolds(),
  ])

  return (
    <>
      <PageHeader
        title="Resources"
        description="Resources are owner-approved personal context. Agents receive concise summaries, not unlimited access."
      />
      <ResourceBoard resources={resources} providerCards={providerCards} softHolds={softHolds} />
    </>
  )
}
