import { getProviderConnectionCards, getResources } from "@/lib/data"
import { ResourcesPageContent } from "@/components/resources/resources-page-content"

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const [{ resources, fetchError }, providerCards] = await Promise.all([
    getResources(),
    getProviderConnectionCards(),
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
      resourcesFetchError={fetchError}
      urlError={urlError}
      deleted={deleted}
    />
  )
}
