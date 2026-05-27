import { BookingStatus } from "@prisma/client"
import { endOfMonth, startOfMonth } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { computeMonthStats } from "@/lib/calendar/calendar-utils"
import { calendarBookingSelect, serializeCalendarBooking } from "@/lib/calendar/serialize-booking"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10)
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10)

  if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Invalid month or year." }, { status: 400 })
  }

  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))
  const daysInMonth = monthEnd.getDate()

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      unit_number: true,
      bookings: {
        where: {
          status: { not: BookingStatus.CANCELLED },
          check_in: { lte: monthEnd },
          check_out: { gt: monthStart },
        },
        select: calendarBookingSelect,
        orderBy: { check_in: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  const rows = properties.map((property) => {
    const bookings = property.bookings.map(serializeCalendarBooking)
    const active = bookings.filter((b) => b.status !== BookingStatus.CANCELLED)
    const { bookedNights, occupancyPct } = computeMonthStats(bookings, month, year)

    return {
      id: property.id,
      name: property.name,
      unitNumber: property.unit_number,
      bookings,
      bookedNights,
      occupancyPct,
      hasOccupancy: active.length > 0,
    }
  })

  rows.sort((a, b) => {
    if (a.hasOccupancy !== b.hasOccupancy) return a.hasOccupancy ? -1 : 1
    if (b.bookedNights !== a.bookedNights) return b.bookedNights - a.bookedNights
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({
    month,
    year,
    daysInMonth,
    properties: rows.map(({ hasOccupancy: _h, ...rest }) => rest),
  })
}
