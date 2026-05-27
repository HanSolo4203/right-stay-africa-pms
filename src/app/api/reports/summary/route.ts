import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { fetchReportsSummary } from "@/lib/reports/fetch-reports-summary"

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const data = await fetchReportsSummary(new URL(request.url).searchParams)
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: data.status })
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
    },
  })
}
