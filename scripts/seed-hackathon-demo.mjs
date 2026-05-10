/**
 * Idempotent hackathon demo seed (Supabase service role).
 *
 * Usage: npm run seed:hackathon
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Primary demo owner (hana / ren / sample conversation): resolved in order:
 *   - HACKATHON_OWNER_USER_ID (uuid) if set
 *   - HACKATHON_OWNER_USERNAME if set
 *   - First match among usernames: amon_kizwa, amon_kizawa (not kizawaamon — that is the partner account)
 *
 * Partner account (extra agents + resources + link to Amon):
 *   - HACKATHON_PARTNER_USER_ID (uuid) if set
 *   - Else profile where email = HACKATHON_PARTNER_EMAIL (default kizawaamon@gmail.com) or username kizawaamon
 *
 * Demo logins (password printed at end): hackathon.*@agentlink.invalid users
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEMO_PASSWORD = "HackathonDemo2026!"

const IDS = {
  amonAgentScheduler: "a0000000-0000-4000-8000-000000000001",
  amonAgentProject: "a0000000-0000-4000-8000-000000000002",
  amonAgentNegotiator: "a0000000-0000-4000-8000-000000000003",
  resMock: "a0000000-0000-4000-8000-000000000011",
  resAvailability: "a0000000-0000-4000-8000-000000000012",
  resSoftHoldCal: "a0000000-0000-4000-8000-000000000013",
  resSharing: "a0000000-0000-4000-8000-000000000014",
  resBrief: "a0000000-0000-4000-8000-000000000015",
  resGoogleCal: "a0000000-0000-4000-8000-000000000016",
  hanaAgentPublic: "b0000000-0000-4000-8000-000000000001",
  hanaAgentPrivate: "b0000000-0000-4000-8000-000000000002",
  renAgentPublic: "c0000000-0000-4000-8000-000000000001",
  friendAccepted: "f0000000-0000-4000-8000-000000000001",
  friendPendingIncoming: "f0000000-0000-4000-8000-000000000002",
  conversationDemo: "d0000000-0000-4000-8000-000000000001",
  msg1: "d0000000-0000-4000-8000-000000000011",
  msg2: "d0000000-0000-4000-8000-000000000012",
  softHold1: "s0000000-0000-4000-8000-000000000001",
  softHold2: "s0000000-0000-4000-8000-000000000002",
  friendAmonKizawa: "f0000000-0000-4000-8000-000000000003",
  kizawaAgentPublic: "e0000000-0000-4000-8000-000000000001",
  kizawaAgentResearch: "e0000000-0000-4000-8000-000000000002",
  kizawaAgentLogistics: "e0000000-0000-4000-8000-000000000003",
  kizResScratch: "e0000000-0000-4000-8000-000000000011",
  kizResRhythm: "e0000000-0000-4000-8000-000000000012",
  kizResBoundaries: "e0000000-0000-4000-8000-000000000013",
  kizResRoadmap: "e0000000-0000-4000-8000-000000000014",
  kizResGoogleCal: "e0000000-0000-4000-8000-000000000015",
}

const DEMO_USERS = [
  {
    key: "hana",
    email: "hackathon.hana.demo@agentlink.invalid",
    username: "hana_demo",
  },
  {
    key: "ren",
    email: "hackathon.ren.demo@agentlink.invalid",
    username: "ren_demo",
  },
  {
    key: "maya",
    email: "hackathon.maya.demo@agentlink.invalid",
    username: "maya_demo",
  },
]

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local")
  if (!existsSync(path)) {
    console.error("Missing .env.local at", path)
    process.exit(1)
  }
  const content = readFileSync(path, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

async function findUserIdByEmail(admin, email) {
  let page = 1
  const perPage = 1000
  while (page < 20) {
    const { data, error } = await admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found.id
    if (data.users.length < perPage) break
    page += 1
  }
  return null
}

async function getOrCreateDemoUser(admin, supabase, { email, username }) {
  let userId = await findUserIdByEmail(admin, email)
  if (!userId) {
    const { data, error } = await admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { username },
    })
    if (error) {
      if (
        error.message?.toLowerCase().includes("already") ||
        error.message?.toLowerCase().includes("registered")
      ) {
        userId = await findUserIdByEmail(admin, email)
      }
      if (!userId) throw error
    } else {
      userId = data.user.id
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      username,
      email: email.toLowerCase(),
      avatar_url: null,
    },
    { onConflict: "id" }
  )
  if (profileError) throw profileError

  return userId
}

async function ensureInternalConnection(supabase, userId) {
  const { data: existing } = await supabase
    .from("mcp_connections")
    .select("id,status")
    .eq("user_id", userId)
    .eq("provider", "internal")
    .maybeSingle()

  if (existing) {
    if (existing.status !== "connected") {
      await supabase
        .from("mcp_connections")
        .update({ status: "connected", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    }
    return existing.id
  }

  const { data, error } = await supabase
    .from("mcp_connections")
    .insert({
      user_id: userId,
      provider: "internal",
      provider_account_id: "agentlink",
      display_name: "AgentLink first-party tools",
      status: "connected",
      scopes: [],
      metadata: { firstParty: true },
    })
    .select("id")
    .single()

  if (error) throw error
  return data.id
}

async function resolvePrimaryAmonProfile(supabase) {
  const byId = process.env.HACKATHON_OWNER_USER_ID?.trim()
  if (byId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,email")
      .eq("id", byId)
      .maybeSingle()
    if (error) throw error
    if (data) return data
    console.error("HACKATHON_OWNER_USER_ID set but no profile row for that id:", byId)
    process.exit(1)
  }

  const explicit = process.env.HACKATHON_OWNER_USERNAME?.trim()
  const candidates = explicit ? [explicit] : ["amon_kizwa", "amon_kizawa"]

  for (const username of candidates) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,email")
      .eq("username", username)
      .maybeSingle()
    if (error) throw error
    if (data) return data
  }

  console.error(
    "No primary demo owner profile (Amon). Create username amon_kizawa or amon_kizwa, or set HACKATHON_OWNER_USERNAME / HACKATHON_OWNER_USER_ID:",
    candidates.join(", ")
  )
  process.exit(1)
}

async function resolvePartnerKizawaProfile(supabase) {
  const byId = process.env.HACKATHON_PARTNER_USER_ID?.trim()
  if (byId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,email")
      .eq("id", byId)
      .maybeSingle()
    if (error) throw error
    if (data) return data
    console.warn("HACKATHON_PARTNER_USER_ID set but no profile row; skipping partner seed.")
    return null
  }

  const email =
    process.env.HACKATHON_PARTNER_EMAIL?.trim().toLowerCase() || "kizawaamon@gmail.com"

  const { data: byEmail, error: e1 } = await supabase
    .from("profiles")
    .select("id,username,email")
    .eq("email", email)
    .maybeSingle()
  if (e1) throw e1
  if (byEmail) return byEmail

  const { data: byUser, error: e2 } = await supabase
    .from("profiles")
    .select("id,username,email")
    .eq("username", "kizawaamon")
    .maybeSingle()
  if (e2) throw e2
  if (byUser) return byUser

  console.warn(
    "Partner profile not found (email",
    email,
    "or username kizawaamon). Skipping Kizawa agents/resources and Amon↔Kizawa friend link."
  )
  return null
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }
  await run(url, serviceKey)
}

async function run(url, serviceKey) {
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const admin = supabase.auth.admin

  const amonProfile = await resolvePrimaryAmonProfile(supabase)
  const amonId = amonProfile.id
  console.log("Resolved primary (Amon):", amonProfile.username, amonId)

  const kizawaProfile = await resolvePartnerKizawaProfile(supabase)
  const kizawaId = kizawaProfile && kizawaProfile.id !== amonId ? kizawaProfile.id : null
  if (kizawaProfile && kizawaId) {
    console.log("Resolved partner (Kizawa):", kizawaProfile.username, kizawaProfile.email, kizawaId)
  } else if (kizawaProfile?.id === amonId) {
    console.warn("Partner profile matches primary user id; skipping duplicate Kizawa seed.")
  }

  const userIds = {}
  for (const u of DEMO_USERS) {
    userIds[u.key] = await getOrCreateDemoUser(admin, supabase, {
      email: u.email,
      username: u.username,
    })
    console.log("Demo user", u.username, userIds[u.key])
  }

  const hanaId = userIds.hana
  const renId = userIds.ren
  const mayaId = userIds.maya
  console.log("maya_demo is searchable for new friend requests (no pre-seeded friend row).", mayaId)

  const resources = [
    {
      id: IDS.resMock,
      user_id: amonId,
      type: "mock",
      name: "Quick notes",
      config: {
        text: "Prefer weekday evenings after 5pm PT. Coffee shops or walks — avoid loud bars for planning calls.",
      },
    },
    {
      id: IDS.resAvailability,
      user_id: amonId,
      type: "mock",
      name: "Hackathon availability",
      config: {
        text: [
          "Preferred days: Tuesday, Thursday, Friday · Evenings 17:00–21:00.",
          "Focus blocks: Mon/Wed 09:00–12:00 (deep work).",
          "Work: mornings for build; afternoons for syncs.",
          "Social: short evening hangs during hackathon.",
          "Notes: Demo for judges — add structured Availability / Soft-hold resources after DB migration 0003.",
        ].join("\n"),
      },
    },
    {
      id: IDS.resSoftHoldCal,
      user_id: amonId,
      type: "mock",
      name: "Soft holds",
      config: {
        text: "When soft_hold_calendar resources exist, agents can use internal tools for tentative blocks. For now this is plain-text context for the demo story.",
      },
    },
    {
      id: IDS.resSharing,
      user_id: amonId,
      type: "mock",
      name: "What friends can see",
      config: {
        text: "Audience: accepted friends. Share summarized availability and high-level goals only — no employer-confidential details.",
      },
    },
    {
      id: IDS.resBrief,
      user_id: amonId,
      type: "mock",
      name: "AgentLink pitch",
      config: {
        text: "Project: AgentLink. Goals: show agent-to-agent coordination with friends and resources. Status: hackathon demo. Constraints: concise replies, concrete time windows. Allowed to share: milestone labels + scheduling prefs only.",
      },
    },
    {
      id: IDS.resGoogleCal,
      user_id: amonId,
      type: "google_calendar",
      name: "Google Calendar",
      config: { connected: false, note: "Connect OAuth in Resources when ready." },
    },
  ]

  const kizawaResources =
    kizawaId == null
      ? []
      : [
          {
            id: IDS.kizResScratch,
            user_id: kizawaId,
            type: "mock",
            name: "Field notes",
            config: {
              text: "Lunch walks clear my head. I like async updates with bullet summaries — long threads are fine, but lead with the decision you need.",
            },
          },
          {
            id: IDS.kizResRhythm,
            user_id: kizawaId,
            type: "mock",
            name: "Weekend rhythm",
            config: {
              text: "Sat: errands + light social. Sun: recharge + light reading. Mon AM: avoid heavy meetings if possible — use for planning.",
            },
          },
          {
            id: IDS.kizResBoundaries,
            user_id: kizawaId,
            type: "mock",
            name: "Collaboration boundaries",
            config: {
              text: "Default to 25–45 min calls. For new collaborators, share milestones first; keep budget numbers private until NDA or trusted friend path.",
            },
          },
          {
            id: IDS.kizResRoadmap,
            user_id: kizawaId,
            type: "mock",
            name: "Roadmap snippets",
            config: {
              text: "Near term: polish onboarding, tighten agent prompts, rehearse judge questions. Medium: OAuth polish for calendar. Avoid promising ship dates in agent chats.",
            },
          },
          {
            id: IDS.kizResGoogleCal,
            user_id: kizawaId,
            type: "google_calendar",
            name: "Calendar (placeholder)",
            config: {
              connected: false,
              note: "Hook up Google Calendar OAuth when you are ready.",
            },
          },
        ]

  const { error: resErr } = await supabase.from("resources").upsert([...resources, ...kizawaResources], {
    onConflict: "id",
  })
  if (resErr) throw resErr

  const agents = [
    {
      id: IDS.amonAgentScheduler,
      user_id: amonId,
      name: "Mochi",
      role: "Warm scheduling helper",
      system_prompt:
        "You are Mochi, Amon's gentle scheduling agent. Be concise, friendly, and respect sharing rules when talking to other people's agents.",
      avatar_url: null,
      is_public: false,
    },
    {
      id: IDS.amonAgentProject,
      user_id: amonId,
      name: "Sora",
      role: "Project context companion",
      system_prompt:
        "You are Sora, Amon's private project agent. Ask crisp follow-ups and keep owner context accurate.",
      avatar_url: null,
      is_public: false,
    },
    {
      id: IDS.amonAgentNegotiator,
      user_id: amonId,
      name: "Nami",
      role: "Lightweight negotiator",
      system_prompt:
        "You are Nami, Amon's agent for finding win-win plans. Stay practical and transparent about constraints.",
      avatar_url: null,
      is_public: false,
    },
    {
      id: IDS.hanaAgentPublic,
      user_id: hanaId,
      name: "Pip",
      role: "Playful calendar scout",
      system_prompt:
        "You are Pip, Hana's friendly public-facing agent for scheduling and quick coordination.",
      avatar_url: null,
      is_public: true,
    },
    {
      id: IDS.hanaAgentPrivate,
      user_id: hanaId,
      name: "Blip",
      role: "Private notes keeper (not shared)",
      system_prompt: "You are Blip, a private agent — never assume you are visible to friends.",
      avatar_url: null,
      is_public: false,
    },
    {
      id: IDS.renAgentPublic,
      user_id: renId,
      name: "Kiki",
      role: "Concise context courier",
      system_prompt:
        "You are Kiki, Ren's precise public agent for lightweight coordination and clear time proposals.",
      avatar_url: null,
      is_public: true,
    },
  ]

  const kizawaAgents =
    kizawaId == null
      ? []
      : [
          {
            id: IDS.kizawaAgentPublic,
            user_id: kizawaId,
            name: "Lumo",
            role: "Outward coordination liaison",
            system_prompt:
              "You are Lumo, the public-facing agent for Kizawa. Be upbeat and direct; propose concrete slots and ask one crisp question at a time.",
            avatar_url: null,
            is_public: true,
          },
          {
            id: IDS.kizawaAgentResearch,
            user_id: kizawaId,
            name: "Pixel",
            role: "Research and link summarizer",
            system_prompt:
              "You are Pixel, a private research aide. Prefer short summaries with sources; never overshare private owner notes.",
            avatar_url: null,
            is_public: false,
          },
          {
            id: IDS.kizawaAgentLogistics,
            user_id: kizawaId,
            name: "River",
            role: "Logistics and timeboxing",
            system_prompt:
              "You are River, a private logistics agent. Turn fuzzy plans into ordered steps and realistic time windows.",
            avatar_url: null,
            is_public: false,
          },
        ]

  const { error: agentErr } = await supabase
    .from("agents")
    .upsert([...agents, ...kizawaAgents], { onConflict: "id" })
  if (agentErr) throw agentErr

  const agentResourceRows = [
    { agent_id: IDS.amonAgentScheduler, resource_id: IDS.resMock },
    { agent_id: IDS.amonAgentScheduler, resource_id: IDS.resAvailability },
    { agent_id: IDS.amonAgentScheduler, resource_id: IDS.resSoftHoldCal },
    { agent_id: IDS.amonAgentScheduler, resource_id: IDS.resSharing },
    { agent_id: IDS.amonAgentProject, resource_id: IDS.resBrief },
    { agent_id: IDS.amonAgentProject, resource_id: IDS.resMock },
    { agent_id: IDS.amonAgentNegotiator, resource_id: IDS.resSharing },
    { agent_id: IDS.amonAgentNegotiator, resource_id: IDS.resAvailability },
    ...(kizawaId == null
      ? []
      : [
          { agent_id: IDS.kizawaAgentPublic, resource_id: IDS.kizResScratch },
          { agent_id: IDS.kizawaAgentPublic, resource_id: IDS.kizResRhythm },
          { agent_id: IDS.kizawaAgentPublic, resource_id: IDS.kizResBoundaries },
          { agent_id: IDS.kizawaAgentResearch, resource_id: IDS.kizResRoadmap },
          { agent_id: IDS.kizawaAgentResearch, resource_id: IDS.kizResScratch },
          { agent_id: IDS.kizawaAgentLogistics, resource_id: IDS.kizResRhythm },
          { agent_id: IDS.kizawaAgentLogistics, resource_id: IDS.kizResBoundaries },
        ]),
  ]

  const arDeleteIds = [
    IDS.amonAgentScheduler,
    IDS.amonAgentProject,
    IDS.amonAgentNegotiator,
    IDS.hanaAgentPublic,
    IDS.hanaAgentPrivate,
    IDS.renAgentPublic,
    IDS.kizawaAgentPublic,
    IDS.kizawaAgentResearch,
    IDS.kizawaAgentLogistics,
  ]
  await supabase.from("agent_resources").delete().in("agent_id", arDeleteIds)
  const { error: arErr } = await supabase.from("agent_resources").insert(agentResourceRows)
  if (arErr) throw arErr

  await supabase.from("friends").delete().eq("user_id", amonId).eq("friend_id", hanaId)
  await supabase.from("friends").delete().eq("user_id", renId).eq("friend_id", amonId)
  if (kizawaId) {
    await supabase.from("friends").delete().eq("user_id", amonId).eq("friend_id", kizawaId)
    await supabase.from("friends").delete().eq("user_id", kizawaId).eq("friend_id", amonId)
  }

  const friendsRows = [
    {
      id: IDS.friendAccepted,
      user_id: amonId,
      friend_id: hanaId,
      status: "accepted",
    },
    {
      id: IDS.friendPendingIncoming,
      user_id: renId,
      friend_id: amonId,
      status: "pending",
    },
    ...(kizawaId
      ? [
          {
            id: IDS.friendAmonKizawa,
            user_id: amonId,
            friend_id: kizawaId,
            status: "accepted",
          },
        ]
      : []),
  ]

  const { error: frErr } = await supabase.from("friends").insert(friendsRows)
  if (frErr) throw frErr

  const probeMcp = await supabase.from("mcp_connections").select("id").limit(1)
  if (!probeMcp.error) {
    const internalConnId = await ensureInternalConnection(supabase, amonId)
    await supabase
      .from("agent_tool_permissions")
      .delete()
      .eq("agent_id", IDS.amonAgentScheduler)
      .eq("user_id", amonId)

    const readTools = ["internal.check_availability", "internal.list_soft_holds"]
    const permRows = readTools.map((tool_id) => ({
      agent_id: IDS.amonAgentScheduler,
      connection_id: internalConnId,
      tool_id,
      user_id: amonId,
    }))
    const { error: permErr } = await supabase.from("agent_tool_permissions").insert(permRows)
    if (permErr) {
      console.warn("Skipping internal tool permissions:", permErr.message)
    }

    if (kizawaId) {
      await ensureInternalConnection(supabase, kizawaId)
    }
  } else {
    console.warn(
      "Skipping MCP / internal tool seed (expected if migration 0002+ is not applied):",
      probeMcp.error.message
    )
  }

  const probeSoftHolds = await supabase.from("soft_holds").select("id").limit(1)
  const hasSoftHoldTable = !probeSoftHolds.error
  if (hasSoftHoldTable) {
    const { data: cal } = await supabase
      .from("resources")
      .select("id")
      .eq("user_id", amonId)
      .eq("type", "soft_hold_calendar")
      .limit(1)
      .maybeSingle()

    if (cal?.id) {
      const now = new Date()
      const day = 24 * 60 * 60 * 1000
      const softHolds = [
        {
          id: IDS.softHold1,
          user_id: amonId,
          resource_id: cal.id,
          title: "Demo: team sync (tentative)",
          start_at: new Date(now.getTime() + 2 * day).toISOString(),
          end_at: new Date(now.getTime() + 2 * day + 45 * 60 * 1000).toISOString(),
          status: "tentative",
          created_by: "owner",
          created_via_tool_id: null,
          conversation_id: null,
          notes: "Hackathon seed hold",
        },
        {
          id: IDS.softHold2,
          user_id: amonId,
          resource_id: cal.id,
          title: "Demo: judge walkthrough",
          start_at: new Date(now.getTime() + 4 * day).toISOString(),
          end_at: new Date(now.getTime() + 4 * day + 60 * 60 * 1000).toISOString(),
          status: "confirmed",
          created_by: "owner",
          created_via_tool_id: null,
          conversation_id: null,
          notes: "Reserved for live demo",
        },
      ]
      const { error: shErr } = await supabase.from("soft_holds").upsert(softHolds, {
        onConflict: "id",
      })
      if (shErr) console.warn("Soft holds seed skipped:", shErr.message)
      else console.log("Seeded soft_holds for existing soft_hold_calendar resource.")
    }
  }

  const now = new Date()
  const day = 24 * 60 * 60 * 1000

  const conversation = {
    id: IDS.conversationDemo,
    initiator_id: amonId,
    my_agent_id: IDS.amonAgentScheduler,
    friend_agent_id: IDS.hanaAgentPublic,
    friend_user_id: hanaId,
    purpose: "Schedule a casual hangout next week (demo conversation)",
    status: "completed",
    outcome: {
      summary: "Tuesday after 6pm PT at a quiet cafe looks good for both sides.",
      reason: "Goal achieved in demo seed.",
      completedByAgentId: IDS.hanaAgentPublic,
    },
  }

  const { error: convErr } = await supabase.from("conversations").upsert(conversation, {
    onConflict: "id",
  })
  if (convErr) throw convErr

  await supabase.from("conversation_messages").delete().eq("conversation_id", IDS.conversationDemo)

  const createdAt = new Date(now.getTime() - day).toISOString()
  const messages = [
    {
      id: IDS.msg1,
      conversation_id: IDS.conversationDemo,
      sender_agent_id: IDS.amonAgentScheduler,
      content:
        "Hi Pip! Amon would love a casual hangout next week. Weekday evenings after 5pm PT work best — any windows on your side?",
      is_termination: false,
      termination_reason: null,
      turn_number: 1,
      status: "completed",
      created_at: createdAt,
    },
    {
      id: IDS.msg2,
      conversation_id: IDS.conversationDemo,
      sender_agent_id: IDS.hanaAgentPublic,
      content:
        "Hi Mochi! Hana is free Tuesday after 6pm — a quiet cafe near downtown would be perfect. Shall we aim for that?",
      is_termination: true,
      termination_reason: "Demo seed: aligned on Tuesday evening cafe plan.",
      turn_number: 2,
      status: "completed",
      created_at: createdAt,
    },
  ]
  const { error: msgErr } = await supabase.from("conversation_messages").insert(messages)
  if (msgErr) throw msgErr

  console.log("\n--- Seed summary ---")
  const checks = [
    () => supabase.from("profiles").select("id", { count: "exact", head: true }).eq("id", amonId),
    () => supabase.from("agents").select("id", { count: "exact", head: true }).eq("user_id", amonId),
    () => supabase.from("resources").select("id", { count: "exact", head: true }).eq("user_id", amonId),
    () =>
      supabase
        .from("friends")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${amonId},friend_id.eq.${amonId}`),
    () => supabase.from("soft_holds").select("id", { count: "exact", head: true }).eq("user_id", amonId),
    () =>
      supabase
        .from("conversation_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", IDS.conversationDemo),
  ]
  const labels = [
    "profiles (amon)",
    "agents (amon)",
    "resources (amon)",
    "friends (amon involved)",
    "soft_holds",
    "demo conversation messages",
  ]
  for (let i = 0; i < checks.length; i += 1) {
    const { count, error } = await checks[i]()
    if (error) console.warn(labels[i], "(skipped):", error.message)
    else console.log(labels[i] + ":", count ?? 0)
  }

  if (kizawaId) {
    const kChecks = [
      () => supabase.from("agents").select("id", { count: "exact", head: true }).eq("user_id", kizawaId),
      () =>
        supabase.from("resources").select("id", { count: "exact", head: true }).eq("user_id", kizawaId),
      () =>
        supabase
          .from("friends")
          .select("id", { count: "exact", head: true })
          .or(`user_id.eq.${kizawaId},friend_id.eq.${kizawaId}`),
    ]
    const kLabels = ["agents (kizawaamon)", "resources (kizawaamon)", "friends (kizawaamon involved)"]
    for (let i = 0; i < kChecks.length; i += 1) {
      const { count, error } = await kChecks[i]()
      if (error) console.warn(kLabels[i], "(skipped):", error.message)
      else console.log(kLabels[i] + ":", count ?? 0)
    }
  }

  console.log("\n--- Hackathon demo flow ---")
  console.log(
    `1. Sign in as ${amonProfile.username} — 3 private agents (Mochi, Sora, Nami) + mock/Google resources; soft holds only if migration 0003 + soft_hold_calendar exist.`
  )
  if (kizawaId) {
    console.log(
      `2. Sign in as kizawaamon@gmail.com — agents Lumo (public), Pixel, River + distinct mock/Google resources; accepted friend with ${amonProfile.username} (start agent chat with Lumo).`
    )
  }
  console.log("3. Friends: accepted with hana_demo (Pip); incoming pending from ren_demo; search maya_demo to send a request.")
  console.log("4. Conversations: seeded thread with Pip; from /conversations/new pick a friend public agent (e.g. Pip, Kiki, or Lumo if linked).")
  console.log("\nDemo accounts (same password):")
  console.log("  Password:", DEMO_PASSWORD)
  for (const u of DEMO_USERS) {
    console.log(`  ${u.username}  <${u.email}>`)
  }
  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
