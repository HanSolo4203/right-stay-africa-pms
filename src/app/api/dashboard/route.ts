import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { fetchDashboardData } from "@/lib/dashboard/fetch-dashboard-data"

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const data = await fetchDashboardData()

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  })
}
