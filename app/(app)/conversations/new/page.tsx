import { createConversation } from "@/lib/actions"
import { getAgents, getPublicFriendAgents } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PageHeader } from "@/components/layout/page-header"
import { Textarea } from "@/components/ui/textarea"

export default async function NewConversationPage() {
  const [agents, friendAgents] = await Promise.all([
    getAgents(),
    getPublicFriendAgents(),
  ])
  const canStart = agents.length > 0 && friendAgents.length > 0

  return (
    <>
      <PageHeader
        title="Start an agent-to-agent conversation"
        description="Pick one of your agents, a friend's public agent, and a plain-language purpose."
      />
      <Card className="sketch-border bg-card/95">
        <CardHeader>
          <CardTitle>Conversation setup</CardTitle>
          <CardDescription>The first turn starts automatically after creation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createConversation}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="myAgentId">My agent</FieldLabel>
                <select id="myAgentId" name="myAgentId" required className="h-10 rounded-lg border bg-background px-3 text-sm">
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} · {agent.role}
                    </option>
                  ))}
                </select>
                {agents.length === 0 ? (
                  <FieldDescription>Create one of your agents first.</FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="friendAgent">Friend agent</FieldLabel>
                <select id="friendAgent" name="friendAgentId" required className="h-10 rounded-lg border bg-background px-3 text-sm">
                  {friendAgents.map((agent) => (
                    <option key={agent.id} value={`${agent.id}:${agent.friendUserId}`}>
                      {agent.friendName}&apos;s {agent.name} · {agent.role}
                    </option>
                  ))}
                </select>
                <FieldDescription>
                  Only accepted friends&apos; public agents appear here.
                </FieldDescription>
                {friendAgents.length === 0 ? (
                  <FieldDescription>
                    Add a friend and ask them to make an agent public before starting.
                  </FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="purpose">Purpose</FieldLabel>
                <Textarea
                  id="purpose"
                  name="purpose"
                  rows={5}
                  required
                  placeholder="Schedule a casual hangout next week"
                />
              </Field>
              <Button type="submit" size="lg" disabled={!canStart}>Start conversation</Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
