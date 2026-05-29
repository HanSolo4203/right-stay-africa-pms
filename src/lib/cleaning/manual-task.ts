import { startOfDay } from "date-fns"
import type { PrismaClient } from "@prisma/client"
import {
  cleaningTaskInclude,
  serializeCleaningTask,
  type CleaningStatus,
  type CleaningType,
} from "@/lib/cleaning/serialize"
import { syncPropertyCleaningMonthRecord } from "@/lib/cleaning/property-month-record"

export type CreateManualCleaningInput = {
  propertyId: string
  scheduledDate: string
  type?: CleaningType
  status?: CleaningStatus
  notes?: string
  cleanerName?: string
}

export async function createManualCleaningTask(
  db: PrismaClient,
  input: CreateManualCleaningInput,
) {
  const property = await db.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true },
  })
  if (!property) {
    return { error: "Property not found." as const }
  }

  const scheduled = startOfDay(new Date(input.scheduledDate))
  if (Number.isNaN(scheduled.getTime())) {
    return { error: "Invalid scheduled date." as const }
  }

  const type = input.type ?? "manual"
  if (!["checkout", "midstay", "manual"].includes(type)) {
    return { error: "Invalid clean type." as const }
  }

  const status = input.status ?? "scheduled"
  if (!["scheduled", "completed", "skipped"].includes(status)) {
    return { error: "Invalid status." as const }
  }

  const row = await db.cleaningTask.create({
    data: {
      property_id: input.propertyId,
      booking_id: null,
      type,
      scheduled_for: scheduled,
      midstay_occurrence: null,
      status,
      notes: input.notes?.trim() || null,
      cleaner_name: input.cleanerName?.trim() || null,
      is_manual_override: true,
      completed_at: status === "completed" ? new Date() : null,
    },
    include: cleaningTaskInclude,
  })

  await syncPropertyCleaningMonthRecord(db, input.propertyId, scheduled)

  return { task: serializeCleaningTask(row) }
}
