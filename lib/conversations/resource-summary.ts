import type { Resource } from "@/lib/types"
import {
  availabilityPolicyConfigSchema,
  sharingRulesConfigSchema,
  softHoldCalendarConfigSchema,
} from "@/lib/resources/schemas"

export function summarizeResources(resources: Resource[]) {
  if (resources.length === 0) {
    return "No owner resources are attached."
  }

  return resources
    .map((resource) => {
      if (resource.type === "mock") {
        return `Short note "${resource.name}": ${String(resource.config.text ?? "")}`
      }

      if (resource.type === "availability_policy") {
        const parsed = availabilityPolicyConfigSchema.safeParse(resource.config)
        if (!parsed.success) {
          return `Availability policy "${resource.name}": unavailable due to invalid configuration.`
        }
        const policy = parsed.data
        return [
          `Availability policy "${resource.name}":`,
          `preferred days: ${formatList(policy.preferredDays)}`,
          `preferred window: ${formatWindow(policy.preferredStart, policy.preferredEnd)}`,
          `default duration: ${policy.defaultDurationMinutes} minutes`,
          `buffer: ${policy.bufferMinutes} minutes`,
          policy.focusBlocks.length > 0
            ? `preserved focus blocks: ${policy.focusBlocks
                .map((block) => `${block.label} (${formatList(block.days)} ${block.start}-${block.end})`)
                .join("; ")}`
            : "preserved focus blocks: none listed",
          policy.workPreference ? `work preference: ${policy.workPreference}` : "",
          policy.socialPreference ? `social preference: ${policy.socialPreference}` : "",
          policy.notes ? `notes: ${policy.notes}` : "",
        ].filter(Boolean).join(" | ")
      }

      if (resource.type === "soft_hold_calendar") {
        const parsed = softHoldCalendarConfigSchema.safeParse(resource.config)
        const upcoming = Array.isArray(resource.config.upcomingSoftHolds)
          ? resource.config.upcomingSoftHolds.slice(0, 8)
          : []
        const base = parsed.success
          ? `AgentLink soft-hold calendar "${resource.name}": timezone ${parsed.data.timezone}; default duration ${parsed.data.defaultDurationMinutes} minutes${parsed.data.notes ? `; notes: ${parsed.data.notes}` : ""}`
          : `AgentLink soft-hold calendar "${resource.name}": configuration needs review`
        const holds = upcoming.length > 0
          ? `upcoming tentative/confirmed holds: ${upcoming.map(formatSoftHold).join("; ")}`
          : "upcoming tentative/confirmed holds: none in the next 14 days"

        return `${base} | ${holds}`
      }

      if (resource.type === "sharing_rules") {
        const parsed = sharingRulesConfigSchema.safeParse(resource.config)
        if (!parsed.success) {
          return `Sharing rules "${resource.name}": unavailable due to invalid configuration.`
        }
        return `Sharing rules "${resource.name}" for ${parsed.data.audience}: ${parsed.data.rules}`
      }

      return `Google Calendar "${resource.name}": ${
        resource.config.connected ? "connected" : "not connected yet"
      }`
    })
    .join("\n")
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none listed"
}

function formatWindow(start?: string, end?: string) {
  return start && end ? `${start}-${end}` : "none listed"
}

function formatSoftHold(value: unknown) {
  if (!value || typeof value !== "object") {
    return "hold"
  }

  const hold = value as Record<string, unknown>
  return `${String(hold.title ?? "Busy")} (${String(hold.start ?? "?")} to ${String(
    hold.end ?? "?"
  )}, ${String(hold.status ?? "tentative")})`
}
