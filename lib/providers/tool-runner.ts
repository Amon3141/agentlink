import { getProviderOAuthConfig } from "@/lib/env"
import { getProviderTool } from "@/lib/providers/registry"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import type { McpProvider } from "@/lib/types"

export type ToolExecutionRequest = {
  agentId: string
  userId: string
  connectionId: string
  toolId: string
  input: Record<string, unknown>
  conversationId?: string | null
}

export type ToolExecutionResponse = {
  ok: boolean
  status: "success" | "denied" | "error"
  summary: string
  result: Record<string, unknown>
}

export type ApprovedToolSummary = {
  toolId: string
  connectionId: string
  provider: McpProvider
  name: string
  description: string
  isWrite: boolean
  connectionName: string
}

const toolTimeoutMs = 12000

export async function executeApprovedTool(
  request: ToolExecutionRequest
): Promise<ToolExecutionResponse> {
  const admin = createSupabaseAdminClient()

  if (!admin) {
    return {
      ok: false,
      status: "error",
      summary: "Provider execution is not configured on this server.",
      result: {},
    }
  }

  const tool = getProviderTool(request.toolId)

  try {
    if (!tool) {
      await insertAudit(request, "denied", {}, "Unknown tool.")
      return denied("Unknown tool.")
    }

    const { data: agent } = await admin
      .from("agents")
      .select("id,user_id")
      .eq("id", request.agentId)
      .eq("user_id", request.userId)
      .single()

    if (!agent) {
      await insertAudit(request, "denied", {}, "Agent ownership check failed.")
      return denied("Agent ownership check failed.")
    }

    const { data: permission } = await admin
      .from("agent_tool_permissions")
      .select("agent_id,connection_id,tool_id,user_id")
      .eq("agent_id", request.agentId)
      .eq("connection_id", request.connectionId)
      .eq("tool_id", request.toolId)
      .eq("user_id", request.userId)
      .maybeSingle()

    if (!permission) {
      await insertAudit(request, "denied", sanitizeInput(request.input), "Tool is not approved for this agent.")
      return denied("Tool is not approved for this agent.")
    }

    const { data: connection } = await admin
      .from("mcp_connections")
      .select("id,user_id,provider,status,expires_at")
      .eq("id", request.connectionId)
      .eq("user_id", request.userId)
      .single()

    if (!connection || connection.status !== "connected" || connection.provider !== tool.provider) {
      await insertAudit(request, "denied", sanitizeInput(request.input), "Connection is unavailable for this tool.")
      return denied("Connection is unavailable for this tool.")
    }

    const parsedInput = tool.inputSchema.parse(request.input) as Record<string, unknown>

    if (tool.provider === "internal") {
      const result = await tool.execute(parsedInput, {
        accessToken: "",
        connectionId: request.connectionId,
        userId: request.userId,
        agentId: request.agentId,
        conversationId: request.conversationId ?? null,
      })
      await insertAudit(request, "success", sanitizeInput(parsedInput), {
        summary: result.summary,
        data: summarizeResult(result.data),
      })
      return {
        ok: true,
        status: "success",
        summary: result.summary,
        result: summarizeResult(result.data),
      }
    }

    const token = await getValidAccessToken({
      connectionId: request.connectionId,
      provider: tool.provider,
      expiresAt: connection.expires_at,
    })

    if (!token) {
      await insertAudit(request, "error", sanitizeInput(parsedInput), "Provider token is unavailable.")
      return errorResult("Provider token is unavailable.")
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), toolTimeoutMs)

    try {
      const result = await tool.execute(parsedInput, {
        accessToken: token,
        connectionId: request.connectionId,
        userId: request.userId,
        agentId: request.agentId,
        conversationId: request.conversationId ?? null,
        signal: controller.signal,
      })
      await insertAudit(request, "success", sanitizeInput(parsedInput), {
        summary: result.summary,
        data: summarizeResult(result.data),
      })
      return {
        ok: true,
        status: "success",
        summary: result.summary,
        result: summarizeResult(result.data),
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Tool execution failed."
    await insertAudit(request, "error", sanitizeInput(request.input), message)
    return errorResult(message)
  }
}

export async function getApprovedToolSummaries(
  agentId: string,
  userId: string
): Promise<ApprovedToolSummary[]> {
  const admin = createSupabaseAdminClient()

  if (!admin) {
    return []
  }

  const { data: permissions } = await admin
    .from("agent_tool_permissions")
    .select("connection_id,tool_id")
    .eq("agent_id", agentId)
    .eq("user_id", userId)

  if (!permissions || permissions.length === 0) {
    return []
  }

  const connectionIds = Array.from(
    new Set(permissions.map((permission) => permission.connection_id as string))
  )
  const toolIds = Array.from(
    new Set(permissions.map((permission) => permission.tool_id as string))
  )

  const [{ data: connections }, { data: tools }] = await Promise.all([
    admin
      .from("mcp_connections")
      .select("id,provider,display_name,status")
      .in("id", connectionIds)
      .eq("user_id", userId)
      .eq("status", "connected"),
    admin
      .from("mcp_tools")
      .select("id,provider,name,description,is_write")
      .in("id", toolIds),
  ])

  const connectionsById = new Map(
    (connections ?? []).map((connection) => [connection.id as string, connection])
  )
  const toolsById = new Map((tools ?? []).map((tool) => [tool.id as string, tool]))

  return permissions.flatMap((permission) => {
    const connection = connectionsById.get(permission.connection_id as string)
    const tool = toolsById.get(permission.tool_id as string)

    if (!connection || !tool || connection.provider !== tool.provider) {
      return []
    }

    return {
      toolId: tool.id as string,
      connectionId: connection.id as string,
      provider: tool.provider as McpProvider,
      name: tool.name as string,
      description: tool.description as string,
      isWrite: Boolean(tool.is_write),
      connectionName: connection.display_name as string,
    }
  })
}

async function getValidAccessToken({
  connectionId,
  provider,
  expiresAt,
}: {
  connectionId: string
  provider: McpProvider
  expiresAt: string | null
}) {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    return null
  }

  const { data: secret } = await admin
    .schema("private")
    .from("mcp_connection_secrets")
    .select("token_payload,refresh_token")
    .eq("connection_id", connectionId)
    .single()

  const payload = secret?.token_payload as { access_token?: string } | null
  const accessToken = payload?.access_token ?? null

  if (!accessToken) {
    return null
  }

  const shouldRefresh =
    provider !== "github" &&
    provider !== "slack" &&
    Boolean(secret?.refresh_token) &&
    Boolean(expiresAt) &&
    new Date(expiresAt!).getTime() < Date.now() + 60_000

  if (!shouldRefresh) {
    return accessToken
  }

  return refreshGoogleAccessToken(connectionId, provider, secret?.refresh_token ?? null)
}

async function refreshGoogleAccessToken(
  connectionId: string,
  provider: McpProvider,
  refreshToken: string | null
) {
  const admin = createSupabaseAdminClient()
  const config = getProviderOAuthConfig(provider)

  if (!admin || !refreshToken || !config.clientId || !config.clientSecret) {
    return null
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  const token = await response.json().catch(() => ({}))

  if (!response.ok || !token.access_token) {
    return null
  }

  const expiresAt = token.expires_in
    ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
    : null

  await Promise.all([
    admin
      .schema("private")
      .from("mcp_connection_secrets")
      .update({
        token_payload: {
          access_token: token.access_token,
          expires_in: token.expires_in ?? null,
          scope: token.scope ?? null,
          token_type: token.token_type ?? null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("connection_id", connectionId),
    admin
      .from("mcp_connections")
      .update({
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId),
  ])

  return String(token.access_token)
}

async function insertAudit(
  request: ToolExecutionRequest,
  status: "success" | "denied" | "error",
  inputsSummary: Record<string, unknown>,
  result: Record<string, unknown> | string
) {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    return
  }

  const tool = getProviderTool(request.toolId)

  await admin.from("tool_call_audit").insert({
    user_id: request.userId,
    agent_id: request.agentId,
    connection_id: request.connectionId,
    conversation_id: request.conversationId ?? null,
    provider: tool?.provider ?? "github",
    tool_id: request.toolId,
    inputs_summary: inputsSummary,
    result_summary: typeof result === "string" ? {} : result,
    status,
    error_message: typeof result === "string" ? result : null,
  })
}

function denied(summary: string): ToolExecutionResponse {
  return { ok: false, status: "denied", summary, result: {} }
}

function errorResult(summary: string): ToolExecutionResponse {
  return { ok: false, status: "error", summary, result: {} }
}

export function sanitizeInput(input: Record<string, unknown>) {
  const sensitive = new Set(["token", "access_token", "refresh_token", "authorization", "password", "secret"])
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      sensitive.has(key.toLowerCase()) ? "[redacted]" : summarizeValue(value),
    ])
  )
}

function summarizeResult(result: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(result, (_key, value) => summarizeValue(value)))
}

function summarizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 1000 ? `${value.slice(0, 1000)}...` : value
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10)
  }

  return value
}
