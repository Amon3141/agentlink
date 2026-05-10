import type { Agent, ProviderConnectionCard, Resource } from "@/lib/types"
import { deleteAgent, saveAgent } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export function AgentForm({
  agent,
  resources = [],
  assignedResourceIds = [],
  providerConnectionCards = [],
  assignedToolPermissionIds = [],
}: {
  agent?: Agent | null
  resources?: Resource[]
  assignedResourceIds?: string[]
  providerConnectionCards?: ProviderConnectionCard[]
  assignedToolPermissionIds?: string[]
}) {
  const assigned = new Set(assignedResourceIds)
  const assignedTools = new Set(assignedToolPermissionIds)
  const connectedProviders = providerConnectionCards.filter(
    (card) => card.connection && card.status === "connected"
  )

  return (
    <Card className="sketch-border bg-card/95">
      <CardHeader>
        <CardTitle>{agent ? "Edit agent" : "Create an agent"}</CardTitle>
        <CardDescription>
          Give your agent a role, a warm personality, and the instructions it needs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveAgent}>
          <input type="hidden" name="agentId" value={agent?.id ?? ""} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" defaultValue={agent?.name} required placeholder="Mochi" />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">Role / personality</FieldLabel>
              <Input
                id="role"
                name="role"
                defaultValue={agent?.role}
                required
                placeholder="Warm scheduling helper"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="systemPrompt">System prompt</FieldLabel>
              <Textarea
                id="systemPrompt"
                name="systemPrompt"
                defaultValue={agent?.system_prompt}
                rows={8}
                required
                placeholder="You are a gentle, concise personal agent..."
              />
              <FieldDescription>
                Resource summaries and conversation goals are injected automatically at runtime.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                defaultValue={agent?.avatar_url ?? ""}
                placeholder="Optional image URL"
              />
            </Field>
            <Field orientation="horizontal">
              <Switch id="isPublic" name="isPublic" defaultChecked={agent?.is_public ?? true} />
              <div>
                <FieldLabel htmlFor="isPublic">Public to accepted friends</FieldLabel>
                <FieldDescription>Private agents stay visible only to you.</FieldDescription>
              </div>
            </Field>
            <Field>
              <FieldLabel>Owner-approved resources</FieldLabel>
              <FieldDescription>
                These resources are injected into this agent&apos;s Clod prompt during turns.
              </FieldDescription>
              <div className="flex flex-col gap-3 rounded-2xl border bg-muted/50 p-3">
                {resources.length > 0 ? (
                  resources.map((resource) => (
                    <label key={resource.id} className="flex items-center gap-3 text-sm">
                      <Checkbox
                        name="resourceIds"
                        value={resource.id}
                        defaultChecked={assigned.has(resource.id)}
                      />
                      <span>
                        {resource.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {resourceLabel(resource.type)}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add a resource first, then attach it here.
                  </p>
                )}
              </div>
            </Field>
            <Field>
              <FieldLabel>Online tool permissions</FieldLabel>
              <FieldDescription>
                These MCP-style tools are available only to this agent and only after validation.
              </FieldDescription>
              <div className="flex flex-col gap-3 rounded-2xl border bg-muted/50 p-3">
                {connectedProviders.length > 0 ? (
                  connectedProviders.map((card) => {
                    const connection = card.connection

                    if (!connection) {
                      return null
                    }

                    return (
                      <div key={card.provider} className="rounded-2xl bg-card/70 p-3">
                        <div className="mb-2">
                          <p className="text-sm font-medium">{card.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {connection.display_name}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {card.tools.map((tool) => {
                            const value = `${connection.id}:${tool.id}`
                            return (
                              <label key={tool.id} className="flex items-start gap-3 text-sm">
                                <Checkbox
                                  name="toolPermissionIds"
                                  value={value}
                                  defaultChecked={assignedTools.has(value)}
                                />
                                <span>
                                  {tool.name}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {tool.is_write ? "write approval" : "read-only"}
                                  </span>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Connect GitHub, Google Calendar, Gmail, or Slack on the Resources page first.
                  </p>
                )}
              </div>
            </Field>
            <Button type="submit" size="lg">Save agent</Button>
          </FieldGroup>
        </form>
        {agent ? (
          <form action={deleteAgent} className="mt-4">
            <input type="hidden" name="agentId" value={agent.id} />
            <Button type="submit" variant="outline">
              Delete agent
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}

function resourceLabel(type: Resource["type"]) {
  const labels: Record<Resource["type"], string> = {
    mock: "mock",
    google_calendar: "Google Calendar",
    availability_policy: "availability policy",
    soft_hold_calendar: "soft holds",
    sharing_rules: "sharing rules",
    project_brief: "project brief",
  }

  return labels[type]
}
