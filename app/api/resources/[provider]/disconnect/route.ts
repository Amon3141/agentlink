import { NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/env"
import { getProviderSlug, normalizeProvider } from "@/lib/providers/registry"
import { createSupabaseAdminClient, getCurrentUserId } from "@/lib/supabase/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params
  const provider = normalizeProvider(providerParam)
  const userId = await getCurrentUserId()
  const admin = createSupabaseAdminClient()

  if (!provider || !userId || !admin) {
    return NextResponse.redirect(`${getSiteUrl()}/resources?error=disconnect`)
  }

  await admin
    .from("mcp_connections")
    .update({
      status: "revoked",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider)

  return NextResponse.redirect(
    `${getSiteUrl()}/resources?provider=${getProviderSlug(provider)}&disconnected=1`
  )
}
