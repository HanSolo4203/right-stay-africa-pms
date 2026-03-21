import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getSignedUrl } from "@/lib/supabase/storage"

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const bucket = searchParams.get("bucket")
  const path = searchParams.get("path")

  if (!bucket || !path) {
    return NextResponse.json(
      { error: "Missing required query params: bucket and path." },
      { status: 400 }
    )
  }

  const role = user.user_metadata?.role
  if (role === "OWNER") {
    const statement = await prisma.statement.findFirst({
      where: { file_url: path },
      select: { property_id: true },
    })
    if (!statement) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }
    const owner = await prisma.owner.findFirst({
      where: { portal_user_id: user.id, property_id: statement.property_id },
    })
    if (!owner) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 })
    }
  }

  try {
    const signedUrl = await getSignedUrl(bucket, path)
    return NextResponse.json({ signedUrl }, { status: 200 })
  } catch (signedUrlError) {
    const message =
      signedUrlError instanceof Error ? signedUrlError.message : "Failed to create signed URL."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
