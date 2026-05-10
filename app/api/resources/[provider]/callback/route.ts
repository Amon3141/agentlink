import { completeProviderOAuth } from "@/lib/providers/oauth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  return completeProviderOAuth(provider, request.url)
}
