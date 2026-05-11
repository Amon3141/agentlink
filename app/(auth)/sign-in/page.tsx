import { AppSparklesIcon } from "@/components/icons/app-sparkles-icon"
import { SignInWithGoogleButton } from "@/components/sign-in-with-google-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function signInErrorMessage(code: string | undefined) {
  switch (code) {
    case "oauth":
      return "Google sign-in could not be started. Try again or use email below."
    case "rate-limit":
      return "Too many magic-link emails were sent. Wait a little, or sign in with Google."
    case "auth-callback":
      return "We could not finish signing you in. Try Google or request a new magic link."
    case "missing-code":
      return "That sign-in link was incomplete. Start again from this page."
    case "demo-login":
      return "Demo login failed. Run npm run seed:hackathon so the demo user exists, or check HACKATHON_DEMO_LOGIN_PASSWORD."
    case "demo-login-disabled":
      return "Demo login is disabled in this environment."
    case "magic-link":
    default:
      return "Email sign-in failed. Try Google or request a fresh magic link."
  }
}

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
            <AppSparklesIcon className="size-6" />
          </div>
          <CardTitle>Welcome to AgentLink</CardTitle>
          <CardDescription>
            Sign in with Google or email. Your agents keep coordination in sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {signInErrorMessage(error)}
            </p>
          ) : null}
          {sent ? (
            <p className="rounded-lg bg-secondary p-4 text-sm">
              Magic link sent. Check your inbox to continue.
            </p>
          ) : null}
          {!sent ? (
            <>
              <SignInWithGoogleButton />
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="whitespace-nowrap text-xs uppercase text-muted-foreground">Or use email</span>
                <Separator className="flex-1" />
              </div>
              <form action="/auth/magic-link" method="post">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="text"
                      autoComplete="email"
                      required
                      placeholder="you@example.com (or demo / hana)"
                    />
                    <FieldDescription>
                      We will email you a one-time link (subject to send limits). For the hackathon demo, type{" "}
                      <span className="font-medium">demo</span> or <span className="font-medium">hana</span> instead of
                      an email, or use the button below.
                    </FieldDescription>
                  </Field>
                  <Button type="submit" size="lg" className="w-full">
                    <AppSparklesIcon data-icon="inline-start" />
                    Send magic link
                  </Button>
                </FieldGroup>
              </form>
              <form action="/auth/demo-login" method="post">
                <Button type="submit" variant="secondary" size="lg" className="w-full">
                  Demo login (Hana)
                </Button>
              </form>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
