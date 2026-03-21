import { Role } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const createUserSchema = z.object({
  email: z.email("A valid email is required."),
  full_name: z.string().min(1, "Full name is required."),
  role: z.enum(Role),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const currentRole = currentUser.user_metadata?.role

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request body.",
      },
      { status: 400 }
    )
  }

  const targetRole = parsed.data.role
  const canCreateAnyRole = currentRole === "SUPER_ADMIN"
  const canCreateOwnerOnly = currentRole === "PROPERTY_MANAGER" && targetRole === Role.OWNER
  if (!canCreateAnyRole && !canCreateOwnerOnly) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const { email, full_name, role, password } = parsed.data
  const { data: createdAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name,
    },
  })

  if (createAuthError || !createdAuthUser.user) {
    return NextResponse.json(
      { error: createAuthError?.message ?? "Failed to create auth user." },
      { status: 400 }
    )
  }

  try {
    const dbUser = await prisma.user.create({
      data: {
        email,
        full_name,
        role,
      },
    })

    return NextResponse.json(
      {
        id: dbUser.id,
        auth_user_id: createdAuthUser.user.id,
        email: dbUser.email,
        full_name: dbUser.full_name,
        role: dbUser.role,
      },
      { status: 201 }
    )
  } catch (dbError) {
    await supabaseAdmin.auth.admin.deleteUser(createdAuthUser.user.id)

    const message = dbError instanceof Error ? dbError.message : "Failed to create user record."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
