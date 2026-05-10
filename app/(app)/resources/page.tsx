import { getProviderConnectionCards, getResources, getSoftHolds } from "@/lib/data"
import { ResourcesPageContent } from "@/components/resources/resources-page-content"

export default async function ResourcesPage() {
  const [resources, providerCards, softHolds] = await Promise.all([
    getResources(),
    getProviderConnectionCards(),
    getSoftHolds(),
  ])

  return (
    <ResourcesPageContent
      resources={resources}
      providerCards={providerCards}
      softHolds={softHolds}
    />
  )
}
