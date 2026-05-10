"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { runNextConversationTurn } from "@/lib/conversations/orchestrator"
import {
  availabilityPolicyConfigSchema,
  projectBriefConfigSchema,
  sharingRulesConfigSchema,
  softHoldCalendarConfigSchema,
  softHoldInputSchema,
  type AvailabilityPolicyConfig,
} from "@/lib/resources/schemas"
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase?.auth.signOut()
  redirect("/sign-in")
}

export async function saveAgent(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const agentId = String(formData.get("agentId") ?? "")

  if (!supabase || !userId) {
    redirect("/agents")
  }

  const payload = {
    user_id: userId,
    name: String(formData.get("name") ?? "Untitled agent").trim(),
    role: String(formData.get("role") ?? "").trim(),
    system_prompt: String(formData.get("systemPrompt") ?? "").trim(),
    avatar_url: String(formData.get("avatarUrl") ?? "").trim() || null,
    is_public: formData.get("isPublic") === "on" || formData.get("isPublic") === "true",
  }

  let savedAgentId = agentId

  if (agentId) {
    const { error } = await supabase
      .from("agents")
      .update(payload)
      .eq("id", agentId)
      .eq("user_id", userId)

    if (error) {
      redirect(`/agents/${agentId}?error=save`)
    }
  } else {
    const { data, error } = await supabase
      .from("agents")
      .insert(payload)
      .select("id")
      .single()

    if (error || !data) {
      redirect("/agents/new?error=save")
    }

    savedAgentId = data.id
  }

  await syncAgentResources(savedAgentId, formData.getAll("resourceIds").map(String))
  await syncAgentToolPermissions(
    savedAgentId,
    formData.getAll("toolPermissionIds").map(String)
  )
  revalidatePath("/agents")
  revalidatePath(`/agents/${savedAgentId}`)
  redirect("/agents")
}

export async function deleteAgent(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const agentId = String(formData.get("agentId") ?? "")

  if (!supabase || !userId || !uuidPattern.test(agentId)) {
    redirect("/agents?error=delete")
  }

  const { error } = await supabase
    .from("agents")
    .delete()
    .eq("id", agentId)
    .eq("user_id", userId)

  revalidatePath("/agents")
  redirect(error ? "/agents?error=delete" : "/agents?deleted=1")
}

export async function saveMockResource(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    redirect("/resources")
  }

  const { error } = await supabase.from("resources").insert({
    user_id: userId,
    type: "mock",
    name: String(formData.get("name") ?? "Mock resource"),
    config: { text: String(formData.get("text") ?? "") },
  })

  if (error) {
    redirect("/resources?error=resource")
  }

  revalidatePath("/resources")
  redirect("/resources")
}

export async function saveAvailabilityPolicyResource(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    redirect("/resources")
  }

  const config = parseAvailabilityPolicyForm(formData)
  const parsed = availabilityPolicyConfigSchema.safeParse(config)

  if (!parsed.success) {
    redirect("/resources?error=availability-policy")
  }

  const { error } = await supabase.from("resources").insert({
    user_id: userId,
    type: "availability_policy",
    name: formText(formData, "name", "Availability policy"),
    config: parsed.data,
  })

  if (error) {
    redirect("/resources?error=availability-policy")
  }

  revalidatePath("/resources")
  revalidatePath("/agents")
  redirect("/resources")
}

export async function saveSoftHoldCalendarResource(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    redirect("/resources")
  }

  const parsed = softHoldCalendarConfigSchema.safeParse({
    timezone: formText(formData, "timezone", "local"),
    defaultDurationMinutes: formData.get("defaultDurationMinutes"),
    notes: formText(formData, "notes", ""),
  })

  if (!parsed.success) {
    redirect("/resources?error=soft-hold-calendar")
  }

  const { error } = await supabase.from("resources").insert({
    user_id: userId,
    type: "soft_hold_calendar",
    name: formText(formData, "name", "AgentLink soft holds"),
    config: parsed.data,
  })

  if (error) {
    redirect("/resources?error=soft-hold-calendar")
  }

  revalidatePath("/resources")
  revalidatePath("/agents")
  redirect("/resources")
}

export async function saveSharingRulesResource(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    redirect("/resources")
  }

  const parsed = sharingRulesConfigSchema.safeParse({
    audience: formText(formData, "audience", "Accepted friends"),
    rules: formText(formData, "rules", ""),
  })

  if (!parsed.success) {
    redirect("/resources?error=sharing-rules")
  }

  const { error } = await supabase.from("resources").insert({
    user_id: userId,
    type: "sharing_rules",
    name: formText(formData, "name", "Sharing rules"),
    config: parsed.data,
  })

  if (error) {
    redirect("/resources?error=sharing-rules")
  }

  revalidatePath("/resources")
  revalidatePath("/agents")
  redirect("/resources")
}

export async function saveProjectBriefResource(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    redirect("/resources")
  }

  const parsed = projectBriefConfigSchema.safeParse({
    projectName: formText(formData, "projectName", "Untitled project"),
    goals: formText(formData, "goals", ""),
    status: formText(formData, "status", ""),
    constraints: formText(formData, "constraints", ""),
    allowedToShare: formText(formData, "allowedToShare", ""),
  })

  if (!parsed.success) {
    redirect("/resources?error=project-brief")
  }

  const { error } = await supabase.from("resources").insert({
    user_id: userId,
    type: "project_brief",
    name: formText(formData, "name", parsed.data.projectName),
    config: parsed.data,
  })

  if (error) {
    redirect("/resources?error=project-brief")
  }

  revalidatePath("/resources")
  revalidatePath("/agents")
  redirect("/resources")
}

export async function createSoftHold(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId) {
    redirect("/resources")
  }

  const start = parseDateFormValue(formData.get("startAt"))
  const end = parseDateFormValue(formData.get("endAt"))
  const parsed = softHoldInputSchema.safeParse({
    resourceId: String(formData.get("resourceId") ?? ""),
    title: formText(formData, "title", "Tentative hold"),
    start,
    end,
    notes: formText(formData, "notes", ""),
  })

  if (!parsed.success) {
    redirect("/resources?error=soft-hold")
  }

  const { data: resource } = await supabase
    .from("resources")
    .select("id")
    .eq("id", parsed.data.resourceId)
    .eq("user_id", userId)
    .eq("type", "soft_hold_calendar")
    .single()

  if (!resource) {
    redirect("/resources?error=soft-hold-resource")
  }

  const { error } = await supabase.from("soft_holds").insert({
    user_id: userId,
    resource_id: parsed.data.resourceId,
    title: parsed.data.title,
    start_at: parsed.data.start,
    end_at: parsed.data.end,
    notes: parsed.data.notes ?? "",
    status: "tentative",
    created_by: "owner",
  })

  if (error) {
    redirect("/resources?error=soft-hold")
  }

  revalidatePath("/resources")
  redirect("/resources")
}

export async function cancelSoftHold(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const holdId = String(formData.get("holdId") ?? "")

  if (!supabase || !userId || !uuidPattern.test(holdId)) {
    redirect("/resources?error=soft-hold-cancel")
  }

  const { error } = await supabase
    .from("soft_holds")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", holdId)
    .eq("user_id", userId)

  revalidatePath("/resources")
  redirect(error ? "/resources?error=soft-hold-cancel" : "/resources")
}

export async function deleteResource(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const resourceId = String(formData.get("resourceId") ?? "")

  if (!supabase || !userId || !uuidPattern.test(resourceId)) {
    redirect("/resources?error=delete")
  }

  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("id", resourceId)
    .eq("user_id", userId)

  revalidatePath("/resources")
  revalidatePath("/agents")
  redirect(error ? "/resources?error=delete" : "/resources?deleted=1")
}

export async function sendFriendRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const query = String(formData.get("query") ?? "").trim().toLowerCase()

  if (!supabase || !userId || !query) {
    redirect("/friends")
  }

  const column = query.includes("@") ? "email" : "username"
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq(column, query)
    .neq("id", userId)
    .maybeSingle()

  if (!profile) {
    redirect("/friends?error=not-found")
  }

  const { data: existing } = await supabase
    .from("friends")
    .select("id")
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${userId})`
    )
    .maybeSingle()

  if (existing) {
    redirect("/friends?error=already-connected")
  }

  const { error } = await supabase.from("friends").insert({
    user_id: userId,
    friend_id: profile.id,
    status: "pending",
  })

  if (error) {
    redirect("/friends?error=request")
  }

  revalidatePath("/friends")
  redirect("/friends?sent=1")
}

export async function acceptFriendRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const friendRowId = String(formData.get("friendRowId") ?? "")

  if (!supabase || !userId || !uuidPattern.test(friendRowId)) {
    redirect("/friends?error=accept")
  }

  const { error } = await supabase
    .from("friends")
    .update({ status: "accepted" })
    .eq("id", friendRowId)
    .eq("friend_id", userId)
    .eq("status", "pending")

  revalidatePath("/friends")
  redirect(error ? "/friends?error=accept" : "/friends?accepted=1")
}

export async function rejectFriendRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const friendRowId = String(formData.get("friendRowId") ?? "")

  if (!supabase || !userId || !uuidPattern.test(friendRowId)) {
    redirect("/friends?error=reject")
  }

  const { error } = await supabase
    .from("friends")
    .delete()
    .eq("id", friendRowId)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

  revalidatePath("/friends")
  redirect(error ? "/friends?error=reject" : "/friends?removed=1")
}

export async function createConversation(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()
  const myAgentId = String(formData.get("myAgentId") ?? "")
  const [friendAgentId, friendUserId] = String(formData.get("friendAgentId") ?? "").split(":")

  if (!supabase || !userId) {
    redirect("/conversations")
  }

  if (!uuidPattern.test(myAgentId) || !uuidPattern.test(friendAgentId) || !uuidPattern.test(friendUserId)) {
    redirect("/conversations/new?error=invalid")
  }

  const [{ data: myAgent }, { data: friendAgent }] = await Promise.all([
    supabase
      .from("agents")
      .select("id,user_id")
      .eq("id", myAgentId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("agents")
      .select("id,user_id,is_public")
      .eq("id", friendAgentId)
      .eq("user_id", friendUserId)
      .eq("is_public", true)
      .single(),
  ])

  if (!myAgent || !friendAgent) {
    redirect("/conversations/new?error=agents")
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      initiator_id: userId,
      my_agent_id: myAgentId,
      friend_agent_id: friendAgentId,
      friend_user_id: friendUserId,
      purpose: String(formData.get("purpose") ?? ""),
      status: "ongoing",
    })
    .select("id")
    .single()

  if (error || !data) {
    redirect("/conversations?error=create")
  }

  const firstTurn = await runNextConversationTurn(data.id)
  if (firstTurn.status === "failed") {
    revalidatePath("/conversations")
    redirect(`/conversations/${data.id}?error=first-turn`)
  }

  revalidatePath("/conversations")
  redirect(`/conversations/${data.id}`)
}

async function syncAgentResources(agentId: string, resourceIds: string[]) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId || !uuidPattern.test(agentId)) {
    return
  }

  const uniqueResourceIds = Array.from(new Set(resourceIds)).filter((resourceId) =>
    uuidPattern.test(resourceId)
  )

  await supabase.from("agent_resources").delete().eq("agent_id", agentId)

  if (uniqueResourceIds.length === 0) {
    return
  }

  const { data: ownedResources } = await supabase
    .from("resources")
    .select("id")
    .in("id", uniqueResourceIds)
    .eq("user_id", userId)

  const rows = (ownedResources ?? []).map((resource) => ({
    agent_id: agentId,
    resource_id: resource.id,
  }))

  if (rows.length > 0) {
    await supabase.from("agent_resources").insert(rows)
  }
}

async function syncAgentToolPermissions(agentId: string, permissionIds: string[]) {
  const supabase = await createSupabaseServerClient()
  const userId = await getCurrentUserId()

  if (!supabase || !userId || !uuidPattern.test(agentId)) {
    return
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("user_id", userId)
    .single()

  if (!agent) {
    return
  }

  const parsedPermissions = Array.from(new Set(permissionIds))
    .map((value) => {
      const [connectionId, toolId] = value.split(":")
      return { connectionId, toolId }
    })
    .filter(
      ({ connectionId, toolId }) =>
        uuidPattern.test(connectionId) &&
        typeof toolId === "string" &&
        /^[a-z_]+\.[a-z_]+$/.test(toolId)
    )

  await supabase
    .from("agent_tool_permissions")
    .delete()
    .eq("agent_id", agentId)
    .eq("user_id", userId)

  if (parsedPermissions.length === 0) {
    return
  }

  const connectionIds = Array.from(
    new Set(parsedPermissions.map((permission) => permission.connectionId))
  )
  const toolIds = Array.from(
    new Set(parsedPermissions.map((permission) => permission.toolId))
  )

  const [{ data: ownedConnections }, { data: availableTools }] = await Promise.all([
    supabase
      .from("mcp_connections")
      .select("id,provider")
      .in("id", connectionIds)
      .eq("user_id", userId)
      .eq("status", "connected"),
    supabase
      .from("mcp_tools")
      .select("id,provider")
      .in("id", toolIds),
  ])

  const connectionById = new Map(
    (ownedConnections ?? []).map((connection) => [connection.id as string, connection])
  )
  const toolById = new Map((availableTools ?? []).map((tool) => [tool.id as string, tool]))

  const rows = parsedPermissions.flatMap(({ connectionId, toolId }) => {
    const connection = connectionById.get(connectionId)
    const tool = toolById.get(toolId)

    if (!connection || !tool || connection.provider !== tool.provider) {
      return []
    }

    return {
      agent_id: agentId,
      connection_id: connectionId,
      tool_id: toolId,
      user_id: userId,
    }
  })

  if (rows.length > 0) {
    await supabase.from("agent_tool_permissions").insert(rows)
  }
}

function parseAvailabilityPolicyForm(formData: FormData): AvailabilityPolicyConfig {
  const focusLabel = formText(formData, "focusLabel", "")
  const focusStart = formText(formData, "focusStart", "")
  const focusEnd = formText(formData, "focusEnd", "")
  const focusDays = formData.getAll("focusDays").map(String)
  const focusBlocks =
    focusLabel && focusStart && focusEnd && focusDays.length > 0
      ? [
          {
            label: focusLabel,
            days: focusDays,
            start: focusStart,
            end: focusEnd,
          },
        ]
      : []

  return {
    preferredDays: formData.getAll("preferredDays").map(String),
    preferredStart: formText(formData, "preferredStart", "") || undefined,
    preferredEnd: formText(formData, "preferredEnd", "") || undefined,
    defaultDurationMinutes: Number(formData.get("defaultDurationMinutes") ?? 30),
    bufferMinutes: Number(formData.get("bufferMinutes") ?? 15),
    focusBlocks,
    workPreference: formText(formData, "workPreference", ""),
    socialPreference: formText(formData, "socialPreference", ""),
    notes: formText(formData, "notes", ""),
  } as AvailabilityPolicyConfig
}

function formText(formData: FormData, key: string, fallback: string) {
  const value = String(formData.get(key) ?? "").trim()
  return value || fallback
}

function parseDateFormValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim()
  if (!text) {
    return ""
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}
