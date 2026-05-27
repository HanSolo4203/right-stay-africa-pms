import { BookingStatus } from "@prisma/client"
import { endOfMonth, startOfMonth } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import { calendarBookingSelect, serializeCalendarBooking } from "@/lib/calendar/serialize-booking"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { id: propertyId } = await context.params
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  })
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10)
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10)

  if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Invalid month or year." }, { status: 400 })
  }

  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(new Date(year, month - 1, 1))

  const [bookings, cancelledBookings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        property_id: propertyId,
        status: { not: BookingStatus.CANCELLED },
        check_in: { lte: monthEnd },
        check_out: { gt: monthStart },
      },
      select: calendarBookingSelect,
      orderBy: { check_in: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        property_id: propertyId,
        status: BookingStatus.CANCELLED,
        check_in: { lte: monthEnd },
        check_out: { gt: monthStart },
      },
      select: calendarBookingSelect,
      orderBy: { check_in: "asc" },
    }),
  ])

  return NextResponse.json({
    bookings: [...bookings, ...cancelledBookings].map(serializeCalendarBooking),
    month,
    year,
    daysInMonth: monthEnd.getDate(),
  })
}
