import { endOfMonth, format, startOfMonth } from "date-fns"
import type { PrismaClient } from "@prisma/client"
import type { StatementExpenseCategoryValue } from "@/lib/validations/statement-expense"
import type { StatementExpenseItem } from "@/types/statement"

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export const SCHEDULE_CLEANING_EXPENSE_ID_PREFIX = "schedule-clean:"

export type ScheduleCleaningTaskForStatement = {
  id: string
  type: "midstay" | "manual"
  bookingId: string | null
  guestName: string | null
  scheduledDate: string
  midstayOccurrence: number | null
  status: string
}

export function isScheduleCleaningExpenseLineId(id: string): boolean {
  return id.startsWith(SCHEDULE_CLEANING_EXPENSE_ID_PREFIX)
}

export function scheduleCleaningTaskIdFromExpenseLineId(id: string): string | null {
  if (!isScheduleCleaningExpenseLineId(id)) return null
  const taskId = id.slice(SCHEDULE_CLEANING_EXPENSE_ID_PREFIX.length)
  return taskId.length > 0 ? taskId : null
}

function formatScheduledLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dateIso
  return format(d, "d MMM")
}

function scheduleCleaningDescription(task: ScheduleCleaningTaskForStatement): string {
  const dateLabel = formatScheduledLabel(task.scheduledDate)
  if (task.type === "manual") {
    return `Manual clean (${dateLabel})`
  }
  const guest = task.guestName?.trim() || "Guest"
  const occurrence =
    task.midstayOccurrence != null ? ` #${task.midstayOccurrence}` : ""
  return `Mid-stay clean${occurrence} — ${guest} (${dateLabel})`
}

function scheduleCleaningCategory(
  type: ScheduleCleaningTaskForStatement["type"]
): StatementExpenseCategoryValue {
  return type === "midstay" ? "MID_STAY_CLEAN" : "CLEANING"
}

/** Operational mid-stay and manual cleans for the property statement expense list. */
export function buildScheduleCleaningExpenseLines(
  tasks: ScheduleCleaningTaskForStatement[],
  options: {
    selectedBookingIds: Set<string>
    defaultUnitPrice?: number
  }
): StatementExpenseItem[] {
  const unitPrice = round2(Math.max(0, options.defaultUnitPrice ?? 0))

  return tasks
    .filter((task) => task.status !== "skipped")
    .filter((task) => {
      if (task.type === "manual") return true
      if (task.type === "midstay") {
        if (!task.bookingId) return true
        return options.selectedBookingIds.has(task.bookingId)
      }
      return false
    })
    .map((task) => ({
      id: `${SCHEDULE_CLEANING_EXPENSE_ID_PREFIX}${task.id}`,
      description: scheduleCleaningDescription(task),
      qty: 1,
      unitPrice,
      total: unitPrice,
      isAutomatic: true,
      expenseCategory: scheduleCleaningCategory(task.type),
    }))
}

export async function loadScheduleCleaningTasksForProperties(
  db: PrismaClient,
  propertyIds: string[],
  month: number,
  year: number
): Promise<Map<string, ScheduleCleaningTaskForStatement[]>> {
  const byProperty = new Map<string, ScheduleCleaningTaskForStatement[]>()
  if (propertyIds.length === 0) return byProperty

  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)

  const rows = await db.cleaningTask.findMany({
    where: {
      property_id: { in: propertyIds },
      scheduled_for: { gte: monthStart, lte: monthEnd },
      type: { in: ["midstay", "manual"] },
    },
    select: {
      id: true,
      property_id: true,
      booking_id: true,
      type: true,
      scheduled_for: true,
      midstay_occurrence: true,
      status: true,
      booking: { select: { guest_name: true } },
    },
    orderBy: [{ scheduled_for: "asc" }, { type: "asc" }],
  })

  for (const row of rows) {
    const type = row.type as "midstay" | "manual"
    if (type !== "midstay" && type !== "manual") continue
    const task: ScheduleCleaningTaskForStatement = {
      id: row.id,
      type,
      bookingId: row.booking_id,
      guestName: row.booking?.guest_name ?? null,
      scheduledDate: format(row.scheduled_for, "yyyy-MM-dd"),
      midstayOccurrence: row.midstay_occurrence,
      status: row.status,
    }
    const list = byProperty.get(row.property_id) ?? []
    list.push(task)
    byProperty.set(row.property_id, list)
  }

  return byProperty
}
