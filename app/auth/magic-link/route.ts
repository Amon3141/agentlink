import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import {
  getHackathonDemoLoginPassword,
  HACKATHON_HANA_DEMO_EMAIL,
  isHackathonDemoLoginRouteEnabled,
  isHackathonDemoLoginTrigger,
} from "@/lib/hackathon-demo-login"
import { getSiteUrl, hasSupabaseEnv } from "@/lib/env"

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const formData = await request.formData()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()

  if (!email) {
    return NextResponse.redirect(new URL("/sign-in?error=magic-link", request.url))
  }

  let response = NextResponse.redirect(new URL("/sign-in?sent=1", request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.redirect(new URL("/sign-in?sent=1", request.url))
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (isHackathonDemoLoginTrigger(email) && isHackathonDemoLoginRouteEnabled()) {
    response = NextResponse.redirect(new URL("/", request.url))
    const { error: demoError } = await supabase.auth.signInWithPassword({
      email: HACKATHON_HANA_DEMO_EMAIL,
      password: getHackathonDemoLoginPassword(),
    })
    if (demoError) {
      return NextResponse.redirect(new URL("/sign-in?error=demo-login", request.url))
    }
    return response
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    const code =
      error.code === "over_email_send_rate_limit" ? "rate-limit" : "magic-link"
    return NextResponse.redirect(new URL(`/sign-in?error=${code}`, request.url))
  }

  return response
}
