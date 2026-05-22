import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import {
  fetchLiveBookingsForProperty,
  parseStatusFilter,
  toLiveBookingDto,
} from "@/lib/uplisting/live-bookings-api"

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get("propertyId")?.trim()
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId query parameter is required." }, { status: 400 })
  }

  const statusFilter = parseStatusFilter(searchParams.get("status"))
  if (searchParams.get("status")?.trim() && !statusFilter) {
    return NextResponse.json(
      { error: "Invalid status. Use confirmed, checked_in, checked_out, or cancelled." },
      { status: 400 }
    )
  }

  const rows = await fetchLiveBookingsForProperty(propertyId, statusFilter)
  const bookings = rows.map(toLiveBookingDto)

  const lastSyncedAt =
    rows.reduce<Date | null>((latest, row) => {
      if (!row.last_synced_at) return latest
      if (!latest || row.last_synced_at > latest) return row.last_synced_at
      return latest
    }, null)?.toISOString() ?? null

  return NextResponse.json({ bookings, lastSyncedAt })
}
