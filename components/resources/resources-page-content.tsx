"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { AddResourceSheetContent } from "@/components/resources/add-resource-sheet"
import { ResourceBoard } from "@/components/resources/resource-board"
import type { ProviderConnectionCard, Resource, SoftHold } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function ResourcesPageContent({
  resources,
  providerCards,
  softHolds,
}: {
  resources: Resource[]
  providerCards: ProviderConnectionCard[]
  softHolds: SoftHold[]
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <div className="flex flex-col gap-10">
        <PageHeader
          title="Resources"
          description="Resources are owner-approved personal context. Agents receive concise summaries, not unlimited access."
          action={
            <SheetTrigger render={<Button size="lg" className="sketch-border gap-2" />}>
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
              render={<Button size="lg" variant="secondary" className="sketch-border shrink-0 gap-2" />}
            >
              <PlusIcon />
              Add resource
            </SheetTrigger>
          }
        />
      </div>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <AddResourceSheetContent open={sheetOpen} />
      </SheetContent>
    </Sheet>
  )
}
