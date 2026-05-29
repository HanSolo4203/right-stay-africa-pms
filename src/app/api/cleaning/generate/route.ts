import { BookingStatus } from "@prisma/client"
import { differenceInDays, startOfDay } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { generateCleaningTasks } from "@/lib/cleaning-calculator"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json().catch(() => ({}))
  } catch {
    body = {}
  }

  const maybePropertyId =
    body && typeof body === "object" && "propertyId" in body
      ? (String((body as { propertyId?: string }).propertyId ?? "").trim() || undefined)
      : undefined

  const today = startOfDay(new Date())

  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: [BookingStatus.CANCELLED] },
      check_out: { gte: today },
      ...(maybePropertyId && { property_id: maybePropertyId }),
    },
    select: {
      id: true,
      property_id: true,
      check_in: true,
      check_out: true,
      cleaning_schedule_locked: true,
    },
  })

  let created = 0

  for (const booking of bookings) {
    if (!booking.property_id) continue
    if (booking.cleaning_schedule_locked) continue

    const tasks = generateCleaningTasks({
      bookingId: booking.id,
      propertyId: booking.property_id,
      checkIn: new Date(booking.check_in),
      checkOut: new Date(booking.check_out),
      nights: differenceInDays(new Date(booking.check_out), new Date(booking.check_in)),
    })

    for (const task of tasks) {
      const existing = await prisma.cleaningTask.findFirst({
        where: {
          booking_id: task.bookingId,
          type: task.type,
          midstay_occurrence: task.midstayOccurrence,
        },
        select: { id: true, is_manual_override: true },
      })

      if (existing) {
        if (!existing.is_manual_override) {
          await prisma.cleaningTask.update({
            where: { id: existing.id },
            data: { scheduled_for: task.scheduledDate },
          })
        }
        continue
      }

      await prisma.cleaningTask.create({
        data: {
          booking_id: task.bookingId,
          property_id: task.propertyId,
          type: task.type,
          scheduled_for: task.scheduledDate,
          midstay_occurrence: task.midstayOccurrence,
          status: task.status,
          is_manual_override: false,
        },
      })
      created += 1
    }
  }

  return NextResponse.json({
    created,
    bookingsProcessed: bookings.length,
    ...(maybePropertyId && { propertyId: maybePropertyId }),
  })
}

