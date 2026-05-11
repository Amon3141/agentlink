"use client"

import {
  saveAvailabilityPolicyResource,
  saveMockResource,
  saveSharingRulesResource,
  updateSoftHoldCalendarResource,
} from "@/lib/actions"
import type { Resource } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function ShortNoteResourceForm({ resource }: { resource?: Resource | null }) {
  const text = resource?.type === "mock" ? String(resource.config.text ?? "") : ""

  return (
    <form action={saveMockResource} key={resource?.id ?? "new"}>
      {resource?.type === "mock" ? <input type="hidden" name="resourceId" value={resource.id} /> : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="mock-name">Name</FieldLabel>
          <Input
            id="mock-name"
            name="name"
            required
            placeholder="Weekly planning"
            defaultValue={resource?.type === "mock" ? resource.name : undefined}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="mock-text">Context</FieldLabel>
          <Textarea id="mock-text" name="text" required rows={6} defaultValue={text} />
          <FieldDescription>
            Keep this human-readable. The prompt builder summarizes it for agent turns.
          </FieldDescription>
        </Field>
        <Button type="submit">{resource?.type === "mock" ? "Save changes" : "Save short note"}</Button>
      </FieldGroup>
    </form>
  )
}

export function AvailabilityPolicyForm() {
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

export function SoftHoldCalendarForm({ resource }: { resource: Resource }) {
  const cfg = resource.type === "soft_hold_calendar" ? resource.config : {}
  const timezone = String(cfg.timezone ?? "local")
  const defaultDuration = Number(cfg.defaultDurationMinutes ?? 30)
  const notes = String(cfg.notes ?? "")

  return (
    <form action={updateSoftHoldCalendarResource}>
      <input type="hidden" name="resourceId" value={resource.id} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="soft-calendar-name">Name</FieldLabel>
          <Input
            id="soft-calendar-name"
            name="name"
            required
            placeholder="Calendar"
            defaultValue={resource.name}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <Input id="timezone" name="timezone" defaultValue={timezone} />
        </Field>
        <Field>
          <FieldLabel htmlFor="soft-default-duration">Default minutes</FieldLabel>
          <Input
            id="soft-default-duration"
            name="defaultDurationMinutes"
            type="number"
            min="15"
            defaultValue={defaultDuration}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="soft-calendar-notes">Notes</FieldLabel>
          <Textarea
            id="soft-calendar-notes"
            name="notes"
            rows={3}
            placeholder="Use this for tentative meeting plans until you approve a real calendar write."
            defaultValue={notes}
          />
        </Field>
        <Button type="submit">Save calendar</Button>
      </FieldGroup>
    </form>
  )
}

export function SharingRulesForm() {
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
