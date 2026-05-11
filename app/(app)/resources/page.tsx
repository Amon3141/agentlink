import { getProviderConnectionCards, getResources, getSoftHolds } from "@/lib/data"
import { ResourcesPageContent } from "@/components/resources/resources-page-content"

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const [{ resources, fetchError }, providerCards, softHolds] = await Promise.all([
    getResources(),
    getProviderConnectionCards(),
    getSoftHolds(),
  ])

  const urlError = typeof params.error === "string" ? params.error : undefined
  const deletedRaw = params.deleted
  const deleted =
    deletedRaw === "1" ||
    deletedRaw === "true" ||
    (Array.isArray(deletedRaw) && deletedRaw.includes("1"))

  return (
    <ResourcesPageContent
      resources={resources}
      providerCards={providerCards}
      softHolds={softHolds}
      resourcesFetchError={fetchError}
      urlError={urlError}
      deleted={deleted}
    />
  )
}
