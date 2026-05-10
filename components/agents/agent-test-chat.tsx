"use client"

import { useState, useTransition } from "react"
import type { Agent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

export function AgentTestChat({ agent }: { agent: Agent }) {
  const [input, setInput] = useState("Ask a friend if they are free next Tuesday evening.")
  const [reply, setReply] = useState("")
  const [isPending, startTransition] = useTransition()

  function testAgent() {
    startTransition(async () => {
      const response = await fetch("/api/test-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, input }),
      })
      const data = await response.json().catch(() => null)
      setReply(
        response.ok
          ? data?.message ?? "No response yet."
          : data?.error ?? "The test chat could not reach Clod."
      )
    })
  }

  return (
    <Card className="sketch-border bg-card/95">
      <CardHeader>
        <CardTitle>Test chat</CardTitle>
        <CardDescription>Try the agent prompt before it talks to another agent.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="testMessage">Message</FieldLabel>
            <Textarea
              id="testMessage"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={5}
            />
          </Field>
          <Button type="button" onClick={testAgent} disabled={isPending}>
            {isPending ? "Thinking..." : "Test agent"}
          </Button>
          {reply ? (
            <div className="rounded-2xl bg-secondary p-4 text-sm">{reply}</div>
          ) : null}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
