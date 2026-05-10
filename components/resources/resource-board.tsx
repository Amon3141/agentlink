"use client"

import {
  CalendarDaysIcon,
  FileTextIcon,
  MailIcon,
  MessageSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "lucide-react"
import {
  cancelSoftHold,
  createSoftHold,
  deleteResource,
  saveAvailabilityPolicyResource,
  saveMockResource,
  saveProjectBriefResource,
  saveSharingRulesResource,
  saveSoftHoldCalendarResource,
} from "@/lib/actions"
import type { ProviderConnectionCard, Resource, SoftHold } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

export function ResourceBoard({
  resources,
  providerCards,
  softHolds,
}: {
  resources: Resource[]
  providerCards: ProviderConnectionCard[]
  softHolds: SoftHold[]
}) {
  const softHoldCalendars = resources.filter((resource) => resource.type === "soft_hold_calendar")
  const activeSoftHolds = softHolds.filter((hold) => hold.status !== "cancelled")

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border bg-muted/20 p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--muted))_0,transparent_32%)] opacity-40" />
        <div className="relative flex flex-wrap items-start gap-4">
          {resources.length > 0 ? (
            resources.map((resource, index) => (
              <FloatingResourceCard key={resource.id} resource={resource} index={index} />
            ))
          ) : (
            <EmptyBoardCards />
          )}
          <AddResourceSheet />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <SoftHoldDock calendars={softHoldCalendars} holds={activeSoftHolds} />
        <ProviderDock providerCards={providerCards} />
      </div>
    </div>
  )
}

function FloatingResourceCard({ resource, index }: { resource: Resource; index: number }) {
  const shape = floatingShapes[index % floatingShapes.length]

  return (
    <Card className={`sketch-border bg-card/95 ${shape}`}>
      <CardHeader className="pb-2">
        <ResourceIcon type={resource.type} />
        <div className="flex items-center gap-2">
          <Badge variant="outline">{resourceTypeLabel(resource.type)}</Badge>
        </div>
        <CardTitle className="truncate text-base">{resource.name}</CardTitle>
        <CardDescription>{resourceSummary(resource)}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Attach from an agent profile.</p>
        <form action={deleteResource}>
          <input type="hidden" name="resourceId" value={resource.id} />
          <Button type="submit" variant="outline" size="sm">
            Delete
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AddResourceSheet() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="sketch-border min-h-48 w-full max-w-xs rounded-3xl border border-dashed bg-card/80 p-5 text-left transition hover:bg-card sm:w-72"
          />
        }
      >
        <div className="flex h-full flex-col justify-between gap-8">
          <div>
            <PlusIcon />
            <p className="mt-3 text-lg font-medium">Add new resource</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a resource type, then fill in only the details you need.
            </p>
          </div>
          <Badge className="w-fit" variant="secondary">
            Open resource shelf
          </Badge>
        </div>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Add new resource</SheetTitle>
          <SheetDescription>
            First-party resources define what your agents may use and summarize.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-4">
          <ResourceOptionPanel
            icon={<ShieldCheckIcon />}
            title="Availability policy"
            description="Preferred days, buffers, focus time, and scheduling notes."
          >
            <AvailabilityPolicyForm />
          </ResourceOptionPanel>
          <ResourceOptionPanel
            icon={<CalendarDaysIcon />}
            title="Soft hold calendar"
            description="Internal tentative holds before writing to Google Calendar."
          >
            <SoftHoldCalendarForm />
          </ResourceOptionPanel>
          <ResourceOptionPanel
            icon={<FileTextIcon />}
            title="Mock resource"
            description="Freeform text context for quick demos and manual notes."
          >
            <MockResourceForm />
          </ResourceOptionPanel>
          <ResourceOptionPanel
            icon={<ShieldCheckIcon />}
            title="Sharing rules"
            description="Privacy boundaries for what agents may reveal."
          >
            <SharingRulesForm />
          </ResourceOptionPanel>
          <ResourceOptionPanel
            icon={<FileTextIcon />}
            title="Project brief"
            description="Goals, status, constraints, and what the agent may say."
          >
            <ProjectBriefForm />
          </ResourceOptionPanel>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ResourceOptionPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <details className="rounded-2xl border bg-muted/30 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-start gap-3">
          <span className="mt-0.5">{icon}</span>
          <span>
            <span className="block text-sm font-medium">{title}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </span>
        </span>
        <Badge variant="outline">Add</Badge>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

function SoftHoldDock({ calendars, holds }: { calendars: Resource[]; holds: SoftHold[] }) {
  return (
    <Card className="sketch-border bg-card/95">
      <CardHeader>
        <CalendarDaysIcon />
        <CardTitle>Soft holds</CardTitle>
        <CardDescription>AgentLink-only tentative holds, separate from provider calendars.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        {calendars.length > 0 ? (
          <form action={createSoftHold}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="hold-resource">Calendar</FieldLabel>
                <select
                  id="hold-resource"
                  name="resourceId"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  required
                >
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="hold-title">Title</FieldLabel>
                <Input id="hold-title" name="title" required placeholder="Landing page review" />
              </Field>
              <Field>
                <FieldLabel htmlFor="hold-start">Start</FieldLabel>
                <Input id="hold-start" name="startAt" type="datetime-local" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="hold-end">End</FieldLabel>
                <Input id="hold-end" name="endAt" type="datetime-local" required />
              </Field>
              <Button type="submit">Create hold</Button>
            </FieldGroup>
          </form>
        ) : (
          <p className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">
            Add a soft hold calendar from the resource shelf before placing holds.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {holds.length > 0 ? (
            holds.slice(0, 5).map((hold) => (
              <div key={hold.id} className="rounded-2xl border bg-muted/30 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{hold.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(hold.start_at)} - {formatDateTime(hold.end_at)}
                    </p>
                  </div>
                  <Badge variant="outline">{hold.status}</Badge>
                </div>
                <form action={cancelSoftHold} className="mt-3">
                  <input type="hidden" name="holdId" value={hold.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Cancel
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">
              No active soft holds yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProviderDock({ providerCards }: { providerCards: ProviderConnectionCard[] }) {
  return (
    <Card className="sketch-border bg-card/95">
      <CardHeader>
        <ShieldCheckIcon />
        <CardTitle>Tool connectors</CardTitle>
        <CardDescription>Provider and first-party tools available for agent permissions.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {providerCards.map((card) => (
          <ProviderChip key={card.provider} card={card} />
        ))}
      </CardContent>
    </Card>
  )
}

function ProviderChip({ card }: { card: ProviderConnectionCard }) {
  const slug = providerSlug(card.provider)
  const connected = card.status === "connected" && card.connection
  const isInternal = card.provider === "internal"

  return (
    <div className="flex min-w-56 flex-1 flex-col gap-3 rounded-2xl border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <ProviderIcon provider={card.provider} />
          <p className="mt-2 text-sm font-medium">{card.label}</p>
          <p className="text-xs text-muted-foreground">
            {connected ? `${card.tools.length} tool${card.tools.length === 1 ? "" : "s"}` : card.description}
          </p>
        </div>
        <Badge variant={connected ? "secondary" : "outline"}>{providerStatusLabel(card.status)}</Badge>
      </div>
      {connected ? (
        isInternal ? (
          <p className="text-xs text-muted-foreground">Always available. Grant tools from agent settings.</p>
        ) : (
          <form action={`/api/resources/${slug}/disconnect`} method="post">
            <Button type="submit" variant="outline" size="sm">
              Disconnect
            </Button>
          </form>
        )
      ) : (
        <a
          className={buttonVariants({ variant: "secondary", size: "sm" })}
          aria-disabled={!card.configured}
          href={card.configured ? `/api/resources/${slug}/connect` : undefined}
        >
          {card.configured ? `Connect ${card.label}` : "Not configured"}
        </a>
      )}
    </div>
  )
}

function EmptyBoardCards() {
  return (
    <>
      <Card className="sketch-border min-h-40 w-full max-w-xs bg-card/70 sm:w-64">
        <CardHeader>
          <ShieldCheckIcon />
          <CardTitle className="text-base">Availability policy</CardTitle>
          <CardDescription>Tell your agent when meetings feel acceptable.</CardDescription>
        </CardHeader>
      </Card>
      <Card className="sketch-border min-h-44 w-full max-w-xs bg-card/70 sm:w-72">
        <CardHeader>
          <CalendarDaysIcon />
          <CardTitle className="text-base">Soft hold calendar</CardTitle>
          <CardDescription>Create tentative holds without OAuth setup.</CardDescription>
        </CardHeader>
      </Card>
    </>
  )
}

function MockResourceForm() {
  return (
    <form action={saveMockResource}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" required placeholder="Availability notes" />
        </Field>
        <Field>
          <FieldLabel htmlFor="text">Context</FieldLabel>
          <Textarea id="text" name="text" required rows={6} />
          <FieldDescription>
            Keep this human-readable. The prompt builder summarizes it for agent turns.
          </FieldDescription>
        </Field>
        <Button type="submit">Save mock resource</Button>
      </FieldGroup>
    </form>
  )
}

function AvailabilityPolicyForm() {
  const days = [
    ["monday", "Mon"],
    ["tuesday", "Tue"],
    ["wednesday", "Wed"],
    ["thursday", "Thu"],
    ["friday", "Fri"],
    ["saturday", "Sat"],
    ["sunday", "Sun"],
  ]

  return (
    <form action={saveAvailabilityPolicyResource}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="availability-name">Name</FieldLabel>
          <Input id="availability-name" name="name" required placeholder="Mina scheduling policy" />
        </Field>
        <Field>
          <FieldLabel>Preferred days</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {days.map(([value, label]) => (
              <label key={value} className="rounded-full border bg-muted/40 px-3 py-1 text-sm">
                <input className="mr-2" type="checkbox" name="preferredDays" value={value} />
                {label}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="preferred-start">Preferred start</FieldLabel>
            <Input id="preferred-start" name="preferredStart" type="time" defaultValue="17:00" />
          </Field>
          <Field>
            <FieldLabel htmlFor="preferred-end">Preferred end</FieldLabel>
            <Input id="preferred-end" name="preferredEnd" type="time" defaultValue="19:00" />
          </Field>
          <Field>
            <FieldLabel htmlFor="duration">Default minutes</FieldLabel>
            <Input id="duration" name="defaultDurationMinutes" type="number" defaultValue="30" min="15" />
          </Field>
          <Field>
            <FieldLabel htmlFor="buffer">Buffer minutes</FieldLabel>
            <Input id="buffer" name="bufferMinutes" type="number" defaultValue="15" min="0" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="work-preference">Work preference</FieldLabel>
          <Textarea
            id="work-preference"
            name="workPreference"
            rows={3}
            placeholder="Clients only weekdays. Prefer after review blocks."
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="social-preference">Social preference</FieldLabel>
          <Textarea
            id="social-preference"
            name="socialPreference"
            rows={3}
            placeholder="Friends may ask for evenings; 30 minutes is enough."
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="availability-notes">Notes</FieldLabel>
          <Textarea
            id="availability-notes"
            name="notes"
            rows={3}
            placeholder="Never schedule during focus blocks."
          />
        </Field>
        <Button type="submit">Save availability policy</Button>
      </FieldGroup>
    </form>
  )
}

function SoftHoldCalendarForm() {
  return (
    <form action={saveSoftHoldCalendarResource}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="soft-calendar-name">Name</FieldLabel>
          <Input id="soft-calendar-name" name="name" required placeholder="Mochi soft holds" />
        </Field>
        <Field>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <Input id="timezone" name="timezone" defaultValue="local" />
        </Field>
        <Field>
          <FieldLabel htmlFor="soft-default-duration">Default minutes</FieldLabel>
          <Input
            id="soft-default-duration"
            name="defaultDurationMinutes"
            type="number"
            min="15"
            defaultValue="30"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="soft-calendar-notes">Notes</FieldLabel>
          <Textarea
            id="soft-calendar-notes"
            name="notes"
            rows={3}
            placeholder="Use this for tentative meeting holds until I approve a real calendar write."
          />
        </Field>
        <Button type="submit">Save soft hold calendar</Button>
      </FieldGroup>
    </form>
  )
}

function SharingRulesForm() {
  return (
    <form action={saveSharingRulesResource}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sharing-name">Sharing rules name</FieldLabel>
          <Input id="sharing-name" name="name" placeholder="Friend sharing rules" />
        </Field>
        <Field>
          <FieldLabel htmlFor="sharing-audience">Audience</FieldLabel>
          <Input id="sharing-audience" name="audience" defaultValue="Accepted friends" />
        </Field>
        <Field>
          <FieldLabel htmlFor="sharing-rules">Rules</FieldLabel>
          <Textarea id="sharing-rules" name="rules" rows={3} />
        </Field>
        <Button type="submit" variant="secondary">
          Save sharing rules
        </Button>
      </FieldGroup>
    </form>
  )
}

function ProjectBriefForm() {
  return (
    <form action={saveProjectBriefResource}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="project-name">Project brief name</FieldLabel>
          <Input id="project-name" name="name" placeholder="Landing page brief" />
        </Field>
        <Field>
          <FieldLabel htmlFor="project-title">Project</FieldLabel>
          <Input id="project-title" name="projectName" placeholder="AgentLink landing page" />
        </Field>
        <Field>
          <FieldLabel htmlFor="project-goals">Goals</FieldLabel>
          <Textarea id="project-goals" name="goals" rows={3} />
        </Field>
        <Field>
          <FieldLabel htmlFor="project-share">What my agent may say</FieldLabel>
          <Textarea id="project-share" name="allowedToShare" rows={3} />
        </Field>
        <Button type="submit" variant="secondary">
          Save project brief
        </Button>
      </FieldGroup>
    </form>
  )
}

const floatingShapes = [
  "min-h-56 w-full max-w-sm sm:w-80 rotate-[-1deg]",
  "min-h-48 w-full max-w-xs sm:w-72 rotate-[1deg]",
  "min-h-60 w-full max-w-sm sm:w-96 rotate-[0.5deg]",
  "min-h-44 w-full max-w-xs sm:w-64 rotate-[-0.5deg]",
]

function ResourceIcon({ type }: { type: Resource["type"] }) {
  if (type === "availability_policy" || type === "sharing_rules") {
    return <ShieldCheckIcon />
  }

  if (type === "soft_hold_calendar" || type === "google_calendar") {
    return <CalendarDaysIcon />
  }

  return <FileTextIcon />
}

function ProviderIcon({ provider }: { provider: ProviderConnectionCard["provider"] }) {
  if (provider === "internal") {
    return <ShieldCheckIcon />
  }

  if (provider === "github") {
    return <FileTextIcon />
  }

  if (provider === "gmail") {
    return <MailIcon />
  }

  if (provider === "slack") {
    return <MessageSquareIcon />
  }

  return <CalendarDaysIcon />
}

function resourceTypeLabel(type: Resource["type"]) {
  const labels: Record<Resource["type"], string> = {
    mock: "Mock",
    google_calendar: "Google Calendar",
    availability_policy: "Availability policy",
    soft_hold_calendar: "Soft hold calendar",
    sharing_rules: "Sharing rules",
    project_brief: "Project brief",
  }

  return labels[type]
}

function providerStatusLabel(status: ProviderConnectionCard["status"]) {
  const labels: Record<ProviderConnectionCard["status"], string> = {
    connected: "Connected",
    revoked: "Disconnected",
    error: "Needs attention",
    not_configured: "Not configured",
    not_connected: "Not connected",
  }

  return labels[status]
}

function providerSlug(provider: ProviderConnectionCard["provider"]) {
  if (provider === "google_calendar") {
    return "google-calendar"
  }

  return provider
}

function resourceSummary(resource: Resource) {
  if (resource.type === "mock") {
    return truncateSummary(String(resource.config.text ?? "Freeform context"))
  }

  if (resource.type === "availability_policy") {
    const days = Array.isArray(resource.config.preferredDays)
      ? resource.config.preferredDays.join(", ")
      : ""
    return `Scheduling preferences${days ? ` for ${days}` : ""}`
  }

  if (resource.type === "soft_hold_calendar") {
    return `Internal tentative holds, ${String(
      resource.config.defaultDurationMinutes ?? 30
    )} minute default`
  }

  if (resource.type === "sharing_rules") {
    return truncateSummary(String(resource.config.rules ?? "Privacy boundaries for agent replies"))
  }

  if (resource.type === "project_brief") {
    return truncateSummary(String(resource.config.projectName ?? resource.config.goals ?? "Project context"))
  }

  return resource.config.connected ? "Connected calendar context" : "Calendar not connected yet"
}

function truncateSummary(value: string) {
  return value.length > 96 ? `${value.slice(0, 96)}...` : value
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
