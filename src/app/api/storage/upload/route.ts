import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { uploadFile } from "@/lib/supabase/storage"

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const formData = await request.formData()
  const bucket = formData.get("bucket")
  const path = formData.get("path")
  const file = formData.get("file")

  if (typeof bucket !== "string" || typeof path !== "string" || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing required form fields: bucket, path, file." },
      { status: 400 }
    )
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error: "Server storage upload is misconfigured. Missing SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    )
  }

  try {
    const uploadedPath = await uploadFile(bucket, path, file)
    return NextResponse.json({ path: uploadedPath }, { status: 200 })
  } catch (uploadError) {
    const message = uploadError instanceof Error ? uploadError.message : "Failed to upload file."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
