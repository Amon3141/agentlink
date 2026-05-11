import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import {
  getHackathonDemoLoginPassword,
  HACKATHON_HANA_DEMO_EMAIL,
  isHackathonDemoLoginRouteEnabled,
} from "@/lib/hackathon-demo-login"
import { hasSupabaseEnv } from "@/lib/env"

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!isHackathonDemoLoginRouteEnabled()) {
    return NextResponse.redirect(new URL("/sign-in?error=demo-login-disabled", request.url))
  }

  let response = NextResponse.redirect(new URL("/", request.url))

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
          response = NextResponse.redirect(new URL("/", request.url))
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email: HACKATHON_HANA_DEMO_EMAIL,
    password: getHackathonDemoLoginPassword(),
  })

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=demo-login", request.url))
  }

  return response
}
