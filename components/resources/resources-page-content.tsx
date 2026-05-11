"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { AddResourceSheetContent } from "@/components/resources/add-resource-sheet"
import { ResourceBoard } from "@/components/resources/resource-board"
import type { ProviderConnectionCard, Resource, SoftHold } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

function resourcesUrlErrorMessage(code: string): string {
  switch (code) {
    case "soft-hold-calendar":
      return "Could not update the soft hold calendar. Confirm your database migrations include custom resources (0003) and the built-in calendar index (0006)."
    case "availability-policy":
      return "Could not save the availability policy. Check the form values and try again."
    case "sharing-rules":
      return "Could not save sharing rules. Check the form values and try again."
    case "soft-hold":
    case "soft-hold-resource":
      return "Could not create that soft hold. Check the time range and calendar."
    case "soft-hold-cancel":
      return "Could not cancel that hold."
    case "delete":
      return "Could not delete that resource."
    case "delete-protected":
      return "The built-in soft hold calendar cannot be deleted."
    case "resource":
      return "Could not save that short note."
    default:
      return "Something went wrong while saving. Try again."
  }
}

export function ResourcesPageContent({
  resources,
  providerCards,
  softHolds,
  resourcesFetchError,
  urlError,
  deleted,
}: {
  resources: Resource[]
  providerCards: ProviderConnectionCard[]
  softHolds: SoftHold[]
  resourcesFetchError?: string | null
  urlError?: string
  deleted?: boolean
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editMockResource, setEditMockResource] = useState<Resource | null>(null)
  const [editSoftHoldResource, setEditSoftHoldResource] = useState<Resource | null>(null)

  function openAddSheet() {
    setEditMockResource(null)
    setEditSoftHoldResource(null)
    setSheetOpen(true)
  }

  function clearSheetEdits() {
    setEditMockResource(null)
    setEditSoftHoldResource(null)
  }

  const fetchAlert = resourcesFetchError?.trim()
    ? `Resources could not be loaded from the database (${resourcesFetchError}).`
    : null
  const queryAlert = urlError ? resourcesUrlErrorMessage(urlError) : null
  const successNote = deleted ? "Resource deleted." : null

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        setSheetOpen(open)
        if (!open) {
          clearSheetEdits()
        }
      }}
    >
      <div className="flex flex-col gap-10">
        {(fetchAlert || queryAlert || successNote) && (
          <div className="flex flex-col gap-2" role="region" aria-label="Resource page notices">
            {fetchAlert ? (
              <p
                className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {fetchAlert}
              </p>
            ) : null}
            {queryAlert ? (
              <p
                className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
                role="alert"
              >
                {queryAlert}
              </p>
            ) : null}
            {successNote ? (
              <p className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                {successNote}
              </p>
            ) : null}
          </div>
        )}
        <PageHeader
          title="Resources"
          description="Resources are owner-approved personal context. Agents receive concise summaries, not unlimited access."
          action={
            <SheetTrigger render={<Button size="lg" className="sketch-border gap-2" onClick={openAddSheet} />}>
              <PlusIcon />
              Add resource
            </SheetTrigger>
          }
        />
        <ResourceBoard
          resources={resources}
          providerCards={providerCards}
          softHolds={softHolds}
          emptyAddTrigger={
            <SheetTrigger
              render={
                <Button
                  size="lg"
                  variant="secondary"
                  className="sketch-border shrink-0 gap-2"
                  onClick={openAddSheet}
                />
              }
            >
              <PlusIcon />
              Add resource
            </SheetTrigger>
          }
          onEditShortNote={(resource) => {
            clearSheetEdits()
            setEditMockResource(resource)
            setSheetOpen(true)
          }}
          onEditSoftHoldCalendar={(resource) => {
            clearSheetEdits()
            setEditSoftHoldResource(resource)
            setSheetOpen(true)
          }}
        />
      </div>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <AddResourceSheetContent
          open={sheetOpen}
          editMockResource={editMockResource}
          editSoftHoldResource={editSoftHoldResource}
          onClearEdit={clearSheetEdits}
        />
      </SheetContent>
    </Sheet>
  )
}
