import { SparklesIcon } from "lucide-react"
import { signInWithMagicLink } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const { error, sent } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="sketch-border w-full max-w-md bg-card/95">
        <CardHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-accent">
            <SparklesIcon />
          </div>
          <CardTitle>Welcome to AgentLink</CardTitle>
          <CardDescription>
            Sign in with a magic link and let your little agent companions help coordinate life.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              Sign-in could not be completed. Please request a fresh magic link.
            </p>
          ) : sent ? (
            <p className="rounded-lg bg-secondary p-4 text-sm">
              Magic link sent. Check your inbox to continue.
            </p>
          ) : (
            <form action={signInWithMagicLink}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                  <FieldDescription>Demo mode opens the app without Supabase credentials.</FieldDescription>
                </Field>
                <Button type="submit" size="lg">
                  <SparklesIcon data-icon="inline-start" />
                  Send magic link
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
