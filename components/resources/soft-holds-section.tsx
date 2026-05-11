"use client"

import { CalendarClockIcon } from "lucide-react"

import type { Resource, SoftHold } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/components/resources/resource-utils"
import { cancelSoftHold, createSoftHold } from "@/lib/actions"

export function SoftHoldsSection({
  calendars,
  holds,
}: {
  calendars: Resource[]
  holds: SoftHold[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Scheduling and plans</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tentative plans stay inside AgentLink until you promote them to your real calendar.
        </p>
      </header>
      <Card className="sketch-border bg-card/95">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted/50">
              <CalendarClockIcon className="size-6 text-primary" aria-hidden />
            </span>
            <div>
              <CardTitle>Calendar plans</CardTitle>
              <CardDescription>
                Place plans on your AgentLink calendar; they stay separate from OAuth calendars until you
                connect tools.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">Create a plan</h3>
            {calendars.length > 0 ? (
              <form action={createSoftHold}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="plan-resource">Calendar</FieldLabel>
                    <select
                      id="plan-resource"
                      name="resourceId"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                    <FieldLabel htmlFor="plan-title">Title</FieldLabel>
                    <Input id="plan-title" name="title" required placeholder="Landing page review" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plan-start">Start</FieldLabel>
                    <Input id="plan-start" name="startAt" type="datetime-local" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plan-end">End</FieldLabel>
                    <Input id="plan-end" name="endAt" type="datetime-local" required />
                  </Field>
                  <Button type="submit">Create plan</Button>
                </FieldGroup>
              </form>
            ) : (
              <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                Your built-in calendar should appear under Your context. If it is missing, refresh the page
                or confirm database migrations are applied.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">Active plans</h3>
            <div className="flex flex-col gap-2">
              {holds.length > 0 ? (
                holds.slice(0, 8).map((hold) => (
                  <div key={hold.id} className="rounded-2xl border bg-muted/30 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{hold.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(hold.start_at)} – {formatDateTime(hold.end_at)}
                        </p>
                      </div>
                      <Badge variant="outline">{hold.status}</Badge>
                    </div>
                    <form action={cancelSoftHold} className="mt-3">
                      <input type="hidden" name="planId" value={hold.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Cancel
                      </Button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                  No active plans yet.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
