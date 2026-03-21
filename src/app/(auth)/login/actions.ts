"use server"

import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

type LoginInput = z.infer<typeof loginSchema>

type LoginResult =
  | { success: false; error: string }
  | { success: true; redirectTo: string }

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid login details.",
    }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return {
      success: false,
      error: error?.message ?? "Unable to sign in. Please try again.",
    }
  }

  const role = data.user.user_metadata?.role
  if (role === "OWNER") {
    return { success: true, redirectTo: "/owner-portal" }
  }

  if (role === "SUPER_ADMIN" || role === "PROPERTY_MANAGER") {
    return { success: true, redirectTo: "/dashboard" }
  }

  return {
    success: false,
    error: "Your account role is not configured correctly. Please contact support.",
  }
}
