import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/env"

export async function createSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies; middleware refreshes sessions.
          }
        },
      },
    }
  )
}

export async function getCurrentUserId() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return "demo-user"
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminEnv()) {
    return null
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
