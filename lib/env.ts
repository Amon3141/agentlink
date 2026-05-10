export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000"

  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`

  return withProtocol.replace(/\/$/, "")
}

export function hasClodEnv() {
  return Boolean(process.env.CLOD_ENDPOINT)
}

export function hasGoogleCalendarEnv() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function hasSupabaseAdminEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export function getProviderOAuthConfig(provider: string) {
  const siteUrl = getSiteUrl()

  switch (provider) {
    case "github":
      return {
        clientId: process.env.GITHUB_CLIENT_ID ?? "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        redirectUri:
          process.env.GITHUB_REDIRECT_URI ??
          `${siteUrl}/api/resources/github/callback`,
      }
    case "google_calendar":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirectUri:
          process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
          process.env.GOOGLE_REDIRECT_URI ??
          `${siteUrl}/api/resources/google-calendar/callback`,
      }
    case "gmail":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirectUri:
          process.env.GMAIL_REDIRECT_URI ??
          `${siteUrl}/api/resources/gmail/callback`,
      }
    case "slack":
      return {
        clientId: process.env.SLACK_CLIENT_ID ?? "",
        clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
        redirectUri:
          process.env.SLACK_REDIRECT_URI ??
          `${siteUrl}/api/resources/slack/callback`,
      }
    default:
      return {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
      }
  }
}

export function hasProviderOAuthEnv(provider: string) {
  const config = getProviderOAuthConfig(provider)
  return Boolean(config.clientId && config.clientSecret)
}
