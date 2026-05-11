"use client"

import type { ReactNode } from "react"

import type { ProviderConnectionCard, Resource } from "@/lib/types"
import { ResourceLibrarySection } from "@/components/resources/resource-library-section"
import { ToolConnectorsSection } from "@/components/resources/tool-connectors-section"

export function ResourceBoard({
  resources,
  providerCards,
  emptyAddTrigger,
  onEditShortNote,
  onEditSoftHoldCalendar,
}: {
  resources: Resource[]
  providerCards: ProviderConnectionCard[]
  emptyAddTrigger?: ReactNode
  onEditShortNote?: (resource: Resource) => void
  onEditSoftHoldCalendar?: (resource: Resource) => void
}) {
  return (
    <div className="flex flex-col gap-10">
      <ResourceLibrarySection
        resources={resources}
        emptyAddTrigger={emptyAddTrigger}
        onEditShortNote={onEditShortNote}
        onEditSoftHoldCalendar={onEditSoftHoldCalendar}
      />
      <ToolConnectorsSection providerCards={providerCards} />
    </div>
  )
}
