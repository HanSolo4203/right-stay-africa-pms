import { endOfMonth, format, startOfMonth } from "date-fns"
import type { PrismaClient } from "@prisma/client"
import { serializeCleaningTask, cleaningTaskInclude } from "@/lib/cleaning/serialize"

/** Upsert monthly cleaning snapshot for a property after schedule changes. */
export async function syncPropertyCleaningMonthRecord(
  db: PrismaClient,
  propertyId: string,
  referenceDate: Date,
) {
  const month = referenceDate.getMonth() + 1
  const year = referenceDate.getFullYear()
  const monthStart = startOfMonth(referenceDate)
  const monthEnd = endOfMonth(referenceDate)

  const tasks = await db.cleaningTask.findMany({
    where: {
      property_id: propertyId,
      scheduled_for: { gte: monthStart, lte: monthEnd },
    },
    include: cleaningTaskInclude,
    orderBy: [{ scheduled_for: "asc" }, { type: "asc" }],
  })

  const serialized = tasks.map(serializeCleaningTask)
  const completed_count = tasks.filter((t) => t.status === "completed").length
  const skipped_count = tasks.filter((t) => t.status === "skipped").length

  const snapshot = serialized.map((t) => ({
    id: t.id,
    bookingId: t.bookingId,
    propertyName: t.property.name,
    unitNumber: t.property.unitNumber,
    guestName: t.booking?.guestName ?? null,
    type: t.type,
    scheduledDate: format(new Date(t.scheduledDate), "yyyy-MM-dd"),
    status: t.status,
    isManualOverride: t.isManualOverride,
    midstayOccurrence: t.midstayOccurrence,
  }))

  await db.propertyCleaningMonthRecord.upsert({
    where: {
      property_id_month_year: { property_id: propertyId, month, year },
    },
    create: {
      property_id: propertyId,
      month,
      year,
      task_count: tasks.length,
      completed_count,
      skipped_count,
      snapshot,
    },
    update: {
      task_count: tasks.length,
      completed_count,
      skipped_count,
      snapshot,
    },
  })
}

/** Sync all months touched by a list of dates for one property. */
export async function syncPropertyCleaningMonthRecordsForDates(
  db: PrismaClient,
  propertyId: string,
  dates: Date[],
) {
  const seen = new Set<string>()
  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (seen.has(key)) continue
    seen.add(key)
    await syncPropertyCleaningMonthRecord(db, propertyId, d)
  }
}
