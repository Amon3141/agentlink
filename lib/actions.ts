"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSiteUrl } from "@/lib/env"
import { runNextConversationTurn } from "@/lib/conversations/orchestrator"
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    redirect("/")
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    redirect("/sign-in?error=magic-link")
  }

  redirect("/sign-in?sent=1")
}

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
