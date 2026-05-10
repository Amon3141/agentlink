import type { ProviderConnectionCard, Resource } from "@/lib/types"

export function resourceTypeLabel(type: Resource["type"]) {
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

export type ResourceLibraryFilter = "all" | "scheduling" | "privacy" | "notes"

export function resourceFilterCategory(type: Resource["type"]): Exclude<ResourceLibraryFilter, "all"> {
  if (
    type === "availability_policy" ||
    type === "soft_hold_calendar" ||
    type === "google_calendar"
  ) {
    return "scheduling"
  }
  if (type === "sharing_rules") {
    return "privacy"
  }
  return "notes"
}

export function providerStatusLabel(status: ProviderConnectionCard["status"]) {
  const labels: Record<ProviderConnectionCard["status"], string> = {
    connected: "Connected",
    revoked: "Disconnected",
    error: "Needs attention",
    not_configured: "Not configured",
    not_connected: "Not connected",
  }

  return labels[status]
}

export function providerSlug(provider: ProviderConnectionCard["provider"]) {
  if (provider === "google_calendar") {
    return "google-calendar"
  }

  return provider
}

export function resourceSummary(resource: Resource) {
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
    return truncateSummary(
      String(resource.config.projectName ?? resource.config.goals ?? "Project context")
    )
  }

  return resource.config.connected ? "Connected calendar context" : "Calendar not connected yet"
}

export function truncateSummary(value: string) {
  return value.length > 96 ? `${value.slice(0, 96)}...` : value
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
