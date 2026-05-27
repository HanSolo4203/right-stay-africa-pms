import { cache } from "react"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type AppRole = "SUPER_ADMIN" | "PROPERTY_MANAGER" | "OWNER"

function parseRole(value: unknown): AppRole | null {
  if (value === "SUPER_ADMIN" || value === "PROPERTY_MANAGER" || value === "OWNER") {
    return value
  }
  return null
}

function parseFullName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export type AuthUser = {
  id: string
  email: string | null
  role: AppRole | null
  fullName: string | null
}

export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  return {
    id: user.id,
    email: user.email ?? null,
    role: parseRole(user.user_metadata?.role),
    fullName: parseFullName(user.user_metadata?.full_name),
  }
})
