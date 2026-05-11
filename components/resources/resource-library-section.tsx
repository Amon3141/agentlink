"use client"

import {
  CalendarClockIcon,
  CalendarDaysIcon,
  FileTextIcon,
  LockIcon,
  NotebookPenIcon,
} from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import { ProviderBrandIcon } from "@/components/icons/provider-brand-icon"
import type { Resource } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  resourceFilterCategory,
  resourceSummary,
  resourceTypeLabel,
  type ResourceLibraryFilter,
} from "@/components/resources/resource-utils"
import { deleteResource } from "@/lib/actions"
import { cn } from "@/lib/utils"

const filterLabels: { id: ResourceLibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduling", label: "Scheduling" },
  { id: "privacy", label: "Privacy" },
  { id: "notes", label: "Notes" },
]

function ResourceTypeIcon({ type }: { type: Resource["type"] }) {
  const common = "size-6 shrink-0"

  if (type === "google_calendar") {
    return <ProviderBrandIcon provider="google_calendar" size={26} />
  }

  if (type === "availability_policy") {
    return <CalendarClockIcon className={cn(common, "text-primary")} aria-hidden />
  }

  if (type === "soft_hold_calendar") {
    return <CalendarDaysIcon className={cn(common, "text-primary")} aria-hidden />
  }

  if (type === "sharing_rules") {
    return <LockIcon className={cn(common, "text-primary")} aria-hidden />
  }

  if (type === "mock") {
    return <NotebookPenIcon className={cn(common, "text-primary")} aria-hidden />
  }

  return <FileTextIcon className={cn(common, "text-primary")} aria-hidden />
}

export function ResourceLibrarySection({
  resources,
  emptyAddTrigger,
  onEditShortNote,
  onEditSoftHoldCalendar,
}: {
  resources: Resource[]
  emptyAddTrigger?: ReactNode
  onEditShortNote?: (resource: Resource) => void
  onEditSoftHoldCalendar?: (resource: Resource) => void
}) {
  const [filter, setFilter] = useState<ResourceLibraryFilter>("all")

  const filtered = useMemo(() => {
    if (filter === "all") {
      return resources
    }
    return resources.filter((r) => resourceFilterCategory(r.type) === filter)
  }, [resources, filter])

  return (
    <section className="relative overflow-hidden rounded-[2rem] border bg-muted/15 p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--muted))_0,transparent_38%)] opacity-50" />
      <div className="relative flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your context</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Owner-approved summaries agents may read. Attach these from each agent&apos;s profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterLabels.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={filter === id ? "secondary" : "outline"}
                className={cn(
                  "rounded-full border-dashed",
                  filter === id && "border-transparent shadow-sm"
                )}
                onClick={() => setFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </header>

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((resource) => (
              <Card
                key={resource.id}
                className="sketch-border bg-card/95 transition-transform duration-200 hover:-rotate-[0.35deg] hover:scale-[1.01]"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <ResourceTypeIcon type={resource.type} />
                    <Badge variant="outline">{resourceTypeLabel(resource.type)}</Badge>
                  </div>
                  <CardTitle className="truncate text-base leading-snug">{resource.name}</CardTitle>
                  <CardDescription className="line-clamp-3">{resourceSummary(resource)}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-end gap-3 pt-0">
                  {resource.type === "mock" && onEditShortNote ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => onEditShortNote(resource)}>
                      Edit
                    </Button>
                  ) : null}
                  {resource.type === "soft_hold_calendar" && onEditSoftHoldCalendar ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditSoftHoldCalendar(resource)}
                    >
                      Edit settings
                    </Button>
                  ) : null}
                  {resource.type === "soft_hold_calendar" ? null : (
                    <form action={deleteResource}>
                      <input type="hidden" name="resourceId" value={resource.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Delete
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : resources.length > 0 ? (
          <p className="rounded-2xl border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing matches this filter. Try another category or choose &quot;All&quot;.
          </p>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-dashed bg-muted/25 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">No resources yet</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Start with an availability policy or a short note, or connect an external calendar below.
              </p>
            </div>
            {emptyAddTrigger}
          </div>
        )}
      </div>
    </section>
  )
}
