/** Email for the Hana hackathon demo account (see scripts/seed-hackathon-demo.mjs). */
export const HACKATHON_HANA_DEMO_EMAIL = "hackathon.hana.demo@agentlink.invalid"

const DEMO_TRIGGERS = new Set([
  "demo",
  "hana",
  "hackathon",
  "hana demo",
  "hackathon demo",
  "hana_demo",
  "demo login",
  "agentlink demo",
])

/**
 * True when the sign-in email field should perform password demo login instead of a magic link.
 */
export function isHackathonDemoLoginTrigger(raw: string): boolean {
  const s = raw.trim().toLowerCase()
  if (!s) return false
  if (s === HACKATHON_HANA_DEMO_EMAIL) return true
  return DEMO_TRIGGERS.has(s)
}

/**
 * Demo password sign-in is always allowed in non-production. In production, set
 * ENABLE_HACKATHON_DEMO_LOGIN=true (e.g. for a hackathon deploy).
 */
export function isHackathonDemoLoginRouteEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true
  return process.env.ENABLE_HACKATHON_DEMO_LOGIN === "true"
}

/** Matches default in scripts/seed-hackathon-demo.mjs (DEMO_PASSWORD). */
export function getHackathonDemoLoginPassword(): string {
  return process.env.HACKATHON_DEMO_LOGIN_PASSWORD ?? "HackathonDemo2026!"
}
