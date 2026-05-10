import { NextResponse } from "next/server"
import { hasGoogleCalendarEnv } from "@/lib/env"
import { getCurrentUserId } from "@/lib/supabase/server"

export async function GET() {
  const userId = await getCurrentUserId()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasGoogleCalendarEnv()) {
    return NextResponse.json({
      status: "not_configured",
      message:
        "Google Calendar credentials are not configured. Mock resources remain available.",
    })
  }

  return NextResponse.json({
    status: "configured",
    message:
      "Google Calendar credentials are present. Token exchange should run only on a server route.",
  })
}
