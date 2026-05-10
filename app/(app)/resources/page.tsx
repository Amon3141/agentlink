import { CalendarDaysIcon, FileTextIcon } from "lucide-react"
import { deleteResource, saveMockResource } from "@/lib/actions"
import { hasGoogleCalendarEnv } from "@/lib/env"
import { getResources } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/layout/page-header"
import { Textarea } from "@/components/ui/textarea"

export default async function ResourcesPage() {
  const resources = await getResources()
  const googleConfigured = hasGoogleCalendarEnv()

  return (
    <>
      <PageHeader
        title="Resources"
        description="Resources are owner-approved personal context. Agents receive concise summaries, not unlimited access."
      />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="sketch-border bg-card/95">
          <CardHeader>
            <FileTextIcon />
            <CardTitle>Mock resource</CardTitle>
            <CardDescription>Paste sample context such as availability notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveMockResource}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" name="name" required placeholder="Availability notes" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="text">Context</FieldLabel>
                  <Textarea id="text" name="text" required rows={8} />
                  <FieldDescription>
                    Keep this human-readable. The prompt builder summarizes it for agent turns.
                  </FieldDescription>
                </Field>
                <Button type="submit">Save mock resource</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="sketch-border bg-card/95">
            <CardHeader>
              <CalendarDaysIcon />
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                {googleConfigured
                  ? "OAuth credentials are configured. Token exchange can be enabled without exposing tokens to the browser."
                  : "Google Calendar credentials are not configured, so calendar access is intentionally disabled."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" disabled>
                {googleConfigured ? "Calendar OAuth ready for server route" : "Calendar not configured"}
              </Button>
            </CardContent>
          </Card>

          {resources.map((resource) => (
            <Card key={resource.id} className="bg-card/90">
              <CardHeader>
                <Badge className="w-fit" variant="outline">{resource.type}</Badge>
                <CardTitle>{resource.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded-2xl bg-muted p-3 text-xs">
                  {JSON.stringify(resource.config, null, 2)}
                </pre>
                <form action={deleteResource} className="mt-3">
                  <input type="hidden" name="resourceId" value={resource.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Delete resource
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
