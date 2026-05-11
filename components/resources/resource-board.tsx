"use client"

import type { ReactNode } from "react"

import type { ProviderConnectionCard, Resource, SoftHold } from "@/lib/types"
import { ResourceLibrarySection } from "@/components/resources/resource-library-section"
import { SoftHoldsSection } from "@/components/resources/soft-holds-section"
import { ToolConnectorsSection } from "@/components/resources/tool-connectors-section"

export function ResourceBoard({
  resources,
  providerCards,
  softHolds,
  emptyAddTrigger,
  onEditShortNote,
  onEditSoftHoldCalendar,
}: {
  resources: Resource[]
  providerCards: ProviderConnectionCard[]
  softHolds: SoftHold[]
  emptyAddTrigger?: ReactNode
  onEditShortNote?: (resource: Resource) => void
  onEditSoftHoldCalendar?: (resource: Resource) => void
}) {
  const softHoldCalendars = resources.filter((resource) => resource.type === "soft_hold_calendar")
  const activeSoftHolds = softHolds.filter((hold) => hold.status !== "cancelled")

  return (
    <div className="flex flex-col gap-10">
      <ResourceLibrarySection
        resources={resources}
        emptyAddTrigger={emptyAddTrigger}
        onEditShortNote={onEditShortNote}
        onEditSoftHoldCalendar={onEditSoftHoldCalendar}
      />
      <SoftHoldsSection calendars={softHoldCalendars} holds={activeSoftHolds} />
      <ToolConnectorsSection providerCards={providerCards} />
    </div>
  )
}
