import { CheckCircle2Icon, OctagonMinusIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function OutcomePanel({
  outcome,
}: {
  outcome: Record<string, unknown> | null
}) {
  if (!outcome) {
    return null
  }

  const stoppedByUser = outcome.stoppedByUser === true

  return (
    <Card className="sketch-border bg-accent/80">
      <CardHeader>
        {stoppedByUser ? <OctagonMinusIcon /> : <CheckCircle2Icon />}
        <CardTitle>{stoppedByUser ? "Conversation stopped" : "Final outcome"}</CardTitle>
        <CardDescription>
          {String(outcome.reason ?? outcome.nextAction ?? "Ready for human approval.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">{String(outcome.summary ?? "The agents completed the conversation.")}</p>
        <p className="rounded-2xl bg-card/70 p-3 text-xs text-muted-foreground">
          Review this outcome before taking action in your real calendar or chat tools.
        </p>
      </CardContent>
    </Card>
  )
}
