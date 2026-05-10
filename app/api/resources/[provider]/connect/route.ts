import { startProviderOAuth } from "@/lib/providers/oauth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  return startProviderOAuth(provider)
}
