import { startProviderOAuth } from "@/lib/providers/oauth"

export async function GET() {
  return startProviderOAuth("google_calendar")
}
