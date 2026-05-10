import type { Resource } from "@/lib/types"

export function summarizeResources(resources: Resource[]) {
  if (resources.length === 0) {
    return "No owner resources are attached."
  }

  return resources
    .map((resource) => {
      if (resource.type === "mock") {
        return `Mock resource "${resource.name}": ${String(resource.config.text ?? "")}`
      }

      return `Google Calendar "${resource.name}": ${
        resource.config.connected ? "connected" : "not connected yet"
      }`
    })
    .join("\n")
}
