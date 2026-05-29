import { BookingStatus } from "@prisma/client"
import { differenceInDays, startOfDay } from "date-fns"
import type { PrismaClient } from "@prisma/client"
import { generateCleaningTasks } from "@/lib/cleaning-calculator"
import {
  cleaningTaskInclude,
  serializeCleaningTask,
  type CleaningStatus,
  type CleaningType,
} from "@/lib/cleaning/serialize"
import { syncPropertyCleaningMonthRecordsForDates } from "@/lib/cleaning/property-month-record"

export async function getBookingCleaningTasks(db: PrismaClient, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      property_id: true,
      check_in: true,
      check_out: true,
      status: true,
      cleaning_schedule_locked: true,
    },
  })
  if (!booking?.property_id) return null

  const tasks = await db.cleaningTask.findMany({
    where: { booking_id: bookingId },
    include: cleaningTaskInclude,
    orderBy: { scheduled_for: "asc" },
  })

  return {
    booking: {
      id: booking.id,
      propertyId: booking.property_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      status: booking.status,
      cleaningScheduleLocked: booking.cleaning_schedule_locked,
      nights: differenceInDays(booking.check_out, booking.check_in),
    },
    tasks: tasks.map(serializeCleaningTask),
  }
}

export async function regenerateBookingCleaningTasks(
  db: PrismaClient,
  bookingId: string,
  options?: { force?: boolean },
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      property_id: true,
      check_in: true,
      check_out: true,
      status: true,
      cleaning_schedule_locked: true,
    },
  })

  if (!booking?.property_id) {
    return { error: "Booking not found." as const }
  }
  if (booking.status === BookingStatus.CANCELLED) {
    return { error: "Cannot schedule cleans for a cancelled booking." as const }
  }
  if (booking.cleaning_schedule_locked && !options?.force) {
    return { error: "Cleaning schedule is locked for this booking." as const }
  }

  const generated = generateCleaningTasks({
    bookingId: booking.id,
    propertyId: booking.property_id,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    nights: differenceInDays(booking.check_out, booking.check_in),
  })

  const existing = await db.cleaningTask.findMany({
    where: { booking_id: bookingId },
  })

  const touchedDates: Date[] = []
  let created = 0

  for (const task of generated) {
    const match = existing.find(
      (e) => e.type === task.type && e.midstay_occurrence === task.midstayOccurrence,
    )
    if (match) {
      if (!match.is_manual_override) {
        await db.cleaningTask.update({
          where: { id: match.id },
          data: { scheduled_for: task.scheduledDate },
        })
        touchedDates.push(task.scheduledDate, match.scheduled_for)
      }
      continue
    }
    await db.cleaningTask.create({
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
    created++
    touchedDates.push(task.scheduledDate)
  }

  await syncPropertyCleaningMonthRecordsForDates(db, booking.property_id, [
    booking.check_in,
    booking.check_out,
    ...touchedDates,
  ])

  return { created }
}

export type BookingCleaningTaskInput = {
  id?: string
  type: CleaningType
  scheduledDate: string
  status?: CleaningStatus
}

export async function replaceBookingCleaningSchedule(
  db: PrismaClient,
  bookingId: string,
  input: {
    tasks: BookingCleaningTaskInput[]
    lockSchedule?: boolean
  },
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      property_id: true,
      check_in: true,
      check_out: true,
      status: true,
    },
  })

  if (!booking?.property_id) {
    return { error: "Booking not found." as const }
  }
  if (booking.status === BookingStatus.CANCELLED) {
    return { error: "Cannot edit cleans for a cancelled booking." as const }
  }

  const stayStart = startOfDay(booking.check_in)
  const stayEnd = startOfDay(booking.check_out)
  const touchedDates: Date[] = [booking.check_in, booking.check_out]

  const existing = await db.cleaningTask.findMany({ where: { booking_id: bookingId } })
  const keepIds = new Set(input.tasks.map((t) => t.id).filter(Boolean) as string[])

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      touchedDates.push(row.scheduled_for)
      await db.cleaningTask.delete({ where: { id: row.id } })
    }
  }

  const sorted = [...input.tasks].sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
  )

  let midstayCounter = 0
  for (const task of sorted) {
    const scheduled = startOfDay(new Date(task.scheduledDate))
    if (scheduled < stayStart || scheduled > stayEnd) {
      return { error: "Clean dates must fall within the booking stay." as const }
    }

    const status = task.status ?? "scheduled"
    if (!["scheduled", "completed", "skipped"].includes(status)) {
      return { error: "Invalid task status." as const }
    }
    if (task.type !== "checkout" && task.type !== "midstay") {
      return { error: "Invalid clean type." as const }
    }

    const midstayOccurrence =
      task.type === "midstay" ? ++midstayCounter : null

    touchedDates.push(scheduled)

    if (task.id) {
      await db.cleaningTask.update({
        where: { id: task.id },
        data: {
          type: task.type,
          scheduled_for: scheduled,
          midstay_occurrence: midstayOccurrence,
          status,
          is_manual_override: true,
          completed_at: status === "completed" ? new Date() : null,
        },
      })
    } else {
      await db.cleaningTask.create({
        data: {
          booking_id: bookingId,
          property_id: booking.property_id,
          type: task.type,
          scheduled_for: scheduled,
          midstay_occurrence: midstayOccurrence,
          status,
          is_manual_override: true,
          completed_at: status === "completed" ? new Date() : null,
        },
      })
    }
  }

  if (input.lockSchedule !== undefined) {
    await db.booking.update({
      where: { id: bookingId },
      data: { cleaning_schedule_locked: input.lockSchedule },
    })
  } else {
    await db.booking.update({
      where: { id: bookingId },
      data: { cleaning_schedule_locked: true },
    })
  }

  await syncPropertyCleaningMonthRecordsForDates(db, booking.property_id, touchedDates)

  return getBookingCleaningTasks(db, bookingId)
}
