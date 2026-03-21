import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { supabaseAdmin } from "@/lib/supabase/admin"

type OwnerRoleUserRow = {
  id: string
  email: string
  full_name: string
}

export async function GET() {
  const user = await getUser()
  if (user?.role !== "SUPER_ADMIN" && user?.role !== "PROPERTY_MANAGER") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const rows: OwnerRoleUserRow[] = []
  let page = 1
  const perPage = 200

  try {
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      for (const u of data.users) {
        if (u.user_metadata?.role !== "OWNER") continue
        const fullName =
          typeof u.user_metadata?.full_name === "string" ? u.user_metadata.full_name.trim() : ""
        rows.push({
          id: u.id,
          email: u.email ?? "",
          full_name: fullName,
        })
      }

      if (data.users.length < perPage) break
      page += 1
      if (page > 50) break
    }

    rows.sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: "base" }))

    return NextResponse.json({ users: rows }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list users."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
