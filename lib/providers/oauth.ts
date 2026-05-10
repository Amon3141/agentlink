import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getProviderOAuthConfig, getSiteUrl, hasProviderOAuthEnv } from "@/lib/env"
import { createSupabaseAdminClient, getCurrentUserId } from "@/lib/supabase/server"
import {
  getProviderDefinition,
  getProviderSlug,
  normalizeProvider,
  type ProviderDefinition,
} from "@/lib/providers/registry"

const oauthStateCookie = "agentlink_oauth_state"

export async function startProviderOAuth(providerParam: string) {
  const provider = normalizeProvider(providerParam)
  const userId = await getCurrentUserId()

  if (!provider || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const definition = getProviderDefinition(provider)
  const config = getProviderOAuthConfig(provider)

  if (!definition || !hasProviderOAuthEnv(provider)) {
    return NextResponse.redirect(
      `${getSiteUrl()}/resources?provider=${getProviderSlug(provider)}&error=not-configured`
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set(oauthStateCookie, `${provider}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: getSiteUrl().startsWith("https://"),
    path: "/",
    maxAge: 10 * 60,
  })

  const url = new URL(definition.authUrl)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("state", state)

  if (provider === "slack") {
    url.searchParams.set("scope", definition.scopes.join(","))
  } else {
    url.searchParams.set("scope", definition.scopes.join(" "))
    url.searchParams.set("response_type", "code")
    url.searchParams.set("access_type", "offline")
    url.searchParams.set("prompt", "consent")
  }

  return NextResponse.redirect(url)
}

export async function completeProviderOAuth(providerParam: string, requestUrl: string) {
  const provider = normalizeProvider(providerParam)
  const userId = await getCurrentUserId()
  const admin = createSupabaseAdminClient()
  const url = new URL(requestUrl)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!provider || !userId || !admin) {
    return NextResponse.redirect(`${getSiteUrl()}/resources?error=oauth-server`)
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(oauthStateCookie)?.value
  cookieStore.delete(oauthStateCookie)

  if (!code || !state || expectedState !== `${provider}:${state}`) {
    return NextResponse.redirect(
      `${getSiteUrl()}/resources?provider=${getProviderSlug(provider)}&error=oauth-state`
    )
  }

  const definition = getProviderDefinition(provider)
  const config = getProviderOAuthConfig(provider)

  if (!definition || !hasProviderOAuthEnv(provider)) {
    return NextResponse.redirect(
      `${getSiteUrl()}/resources?provider=${getProviderSlug(provider)}&error=not-configured`
    )
  }

  try {
    const token = await exchangeCodeForToken(definition, code, config.redirectUri)
    const account = await fetchProviderAccount(definition, token.access_token)
    const expiresAt = token.expires_in
      ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
      : null
    const displayName = account.displayName || definition.label
    const scopes = parseScopes(token.scope, definition.scopes)

    const { data: connection, error: connectionError } = await admin
      .from("mcp_connections")
      .upsert({
        user_id: userId,
        provider,
        provider_account_id: account.accountId,
        display_name: displayName,
        status: "connected",
        scopes,
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        metadata: account.metadata,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider,provider_account_id",
      })
      .select("id")
      .single()

    if (connectionError || !connection) {
      throw connectionError ?? new Error("Connection could not be saved.")
    }

    const { error: secretError } = await admin
      .schema("private")
      .from("mcp_connection_secrets")
      .upsert({
        connection_id: connection.id,
        user_id: userId,
        token_payload: redactTokenPayload(token),
        refresh_token: token.refresh_token ?? null,
        token_type: token.token_type ?? null,
        updated_at: new Date().toISOString(),
      })

    if (secretError) {
      throw secretError
    }

    return NextResponse.redirect(
      `${getSiteUrl()}/resources?provider=${getProviderSlug(provider)}&connected=1`
    )
  } catch {
    return NextResponse.redirect(
      `${getSiteUrl()}/resources?provider=${getProviderSlug(provider)}&error=oauth-callback`
    )
  }
}

type OAuthTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  authed_user?: {
    id?: string
    scope?: string
    access_token?: string
  }
  team?: {
    id?: string
    name?: string
  }
}

async function exchangeCodeForToken(
  definition: ProviderDefinition,
  code: string,
  redirectUri: string
): Promise<OAuthTokenResponse> {
  const config = getProviderOAuthConfig(definition.id)
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
  })

  if (definition.id !== "github") {
    body.set("grant_type", "authorization_code")
  }

  const response = await fetch(definition.tokenUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  })
  const token = (await response.json()) as OAuthTokenResponse & {
    error?: string
    error_description?: string
    ok?: boolean
  }

  if (!response.ok || token.error || token.ok === false || !token.access_token) {
    throw new Error(token.error_description ?? token.error ?? "OAuth token exchange failed.")
  }

  return normalizeSlackToken(definition, token)
}

async function fetchProviderAccount(definition: ProviderDefinition, accessToken: string) {
  if (!definition.accountUrl) {
    return {
      accountId: null,
      displayName: definition.label,
      metadata: {},
    }
  }

  const response = await fetch(definition.accountUrl, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  })
  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.ok === false) {
    return {
      accountId: null,
      displayName: definition.label,
      metadata: {},
    }
  }

  if (definition.id === "github") {
    return {
      accountId: body.id ? String(body.id) : body.login ?? null,
      displayName: body.login ?? body.name ?? definition.label,
      metadata: { avatarUrl: body.avatar_url, profileUrl: body.html_url },
    }
  }

  if (definition.id === "slack") {
    return {
      accountId: body.user_id ?? body.team_id ?? null,
      displayName: body.team ?? body.user ?? definition.label,
      metadata: { teamId: body.team_id, url: body.url },
    }
  }

  return {
    accountId: body.id ?? body.email ?? null,
    displayName: body.email ?? body.name ?? definition.label,
    metadata: { email: body.email, verifiedEmail: body.verified_email },
  }
}

function normalizeSlackToken(
  definition: ProviderDefinition,
  token: OAuthTokenResponse
): OAuthTokenResponse {
  if (definition.id !== "slack" || !token.authed_user?.access_token) {
    return token
  }

  return {
    ...token,
    access_token: token.authed_user.access_token,
    scope: token.authed_user.scope ?? token.scope,
  }
}

function parseScopes(scope: string | undefined, fallback: string[]) {
  if (!scope) {
    return fallback
  }

  return scope.includes(",")
    ? scope.split(",").map((item) => item.trim()).filter(Boolean)
    : scope.split(" ").map((item) => item.trim()).filter(Boolean)
}

function redactTokenPayload(token: OAuthTokenResponse) {
  return {
    access_token: token.access_token,
    expires_in: token.expires_in ?? null,
    scope: token.scope ?? null,
    token_type: token.token_type ?? null,
  }
}
