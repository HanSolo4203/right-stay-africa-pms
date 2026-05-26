import { lineCharge } from "@/lib/owner-statement/compute"
import type { OwnerStatementManualLineV1, OwnerStatementSnapshotV1 } from "@/lib/owner-statement/types"
import {
  buildCleaningFeeExpenseLines,
  buildWelcomePackExpenseLines,
} from "@/lib/clients/statement-financials"
import { statementExpenseItemsToManualLines } from "@/lib/clients/statement-expense-mappers"
import type { StatementExpenseItem } from "@/types/statement"

export type BookingForAutomaticExpenses = {
  id: string
  guestName: string
  cleaningFee: number
}

const AUTOMATIC_ID_PREFIXES = ["welcome-pack:", "cleaning:"] as const

export function isAutomaticExpenseLineId(id: string): boolean {
  return AUTOMATIC_ID_PREFIXES.some((p) => id.startsWith(p))
}

export function bookingIdFromAutomaticExpenseId(id: string): string | null {
  if (!isAutomaticExpenseLineId(id)) return null
  const bookingId = id.split(":").slice(1).join(":")
  return bookingId.length > 0 ? bookingId : null
}

export function expenseLineTotal(qty: number, unitPrice: number): number {
  const q = Math.max(0, qty)
  const u = Math.max(0, unitPrice)
  return Math.round(q * u * 100) / 100
}

export function normalizeStatementExpenseItem(
  item: Pick<StatementExpenseItem, "id" | "description" | "qty" | "unitPrice"> & {
    isAutomatic?: boolean
    addTenPercent?: boolean
    expenseCategory?: StatementExpenseItem["expenseCategory"]
  }
): StatementExpenseItem {
  const qty = Math.max(0, item.qty)
  const unitPrice = Math.max(0, item.unitPrice)
  const base = expenseLineTotal(qty, unitPrice)
  const addTenPercent = item.addTenPercent ?? false
  return {
    id: item.id,
    description: item.description.trim() || item.description,
    qty,
    unitPrice,
    total: lineCharge(base, addTenPercent),
    isAutomatic: item.isAutomatic ?? isAutomaticExpenseLineId(item.id),
    addTenPercent,
    expenseCategory: item.expenseCategory ?? null,
  }
}

/** Keep user edits when the booking set changes; drop lines for removed bookings. */
export function reconcileAutomaticExpenses(
  base: StatementExpenseItem[],
  edited: StatementExpenseItem[] | null | undefined
): StatementExpenseItem[] {
  if (!edited?.length) return base
  const editedById = new Map(edited.map((e) => [e.id, e]))
  return base.map((b) => {
    const override = editedById.get(b.id)
    if (!override) return b
    return normalizeStatementExpenseItem({
      id: b.id,
      description: override.description,
      qty: override.qty,
      unitPrice: override.unitPrice,
      isAutomatic: true,
    })
  })
}

export function automaticExpenseItemsFromSnapshot(
  snap: OwnerStatementSnapshotV1
): StatementExpenseItem[] {
  return snap.manualLines
    .filter((l) => isAutomaticExpenseLineId(l.id))
    .map((l) =>
      normalizeStatementExpenseItem({
        id: l.id,
        description: l.description,
        qty: l.quantity,
        unitPrice: l.unitPrice,
        isAutomatic: true,
      })
    )
}

export function buildBaseAutomaticExpenseItems(
  bookings: BookingForAutomaticExpenses[],
  welcomePackFeePerBooking: number
): StatementExpenseItem[] {
  const cleaningLines = buildCleaningFeeExpenseLines(
    bookings.map((b) => ({
      id: b.id,
      guestName: b.guestName,
      cleaningFee: b.cleaningFee,
    }))
  )
  const welcomePackLines = buildWelcomePackExpenseLines(
    bookings.map((b) => ({ id: b.id, guestName: b.guestName })),
    welcomePackFeePerBooking
  )
  return [...cleaningLines, ...welcomePackLines]
}

export function assertAutomaticExpenseLinesValid(
  lines: StatementExpenseItem[],
  bookingIds: string[]
): void {
  const bookingSet = new Set(bookingIds)
  for (const line of lines) {
    if (!isAutomaticExpenseLineId(line.id)) {
      throw new Error("Invalid automatic expense line.")
    }
    const bookingId = bookingIdFromAutomaticExpenseId(line.id)
    if (!bookingId || !bookingSet.has(bookingId)) {
      throw new Error("Automatic expense does not match a selected booking.")
    }
    if (!line.description.trim()) {
      throw new Error("Automatic expense description is required.")
    }
  }
}

/** Strip auto lines from a payload so the server can re-apply property settings. */
export function filterUserManualLines(
  lines: OwnerStatementManualLineV1[]
): OwnerStatementManualLineV1[] {
  return lines.filter((l) => !isAutomaticExpenseLineId(l.id))
}

/**
 * Cleaning (from CSV) and welcome pack (from property settings) per selected booking.
 */
export function buildAutomaticExpenseManualLines(
  bookings: BookingForAutomaticExpenses[],
  welcomePackFeePerBooking: number
): OwnerStatementManualLineV1[] {
  const cleaningLines = buildCleaningFeeExpenseLines(
    bookings.map((b) => ({
      id: b.id,
      guestName: b.guestName,
      cleaningFee: b.cleaningFee,
    }))
  )
  const welcomePackLines = buildWelcomePackExpenseLines(
    bookings.map((b) => ({ id: b.id, guestName: b.guestName })),
    welcomePackFeePerBooking
  )
  return [
    ...statementExpenseItemsToManualLines(cleaningLines),
    ...statementExpenseItemsToManualLines(welcomePackLines),
  ]
}

export function mergeManualLinesWithAutomatic(
  userLines: OwnerStatementManualLineV1[],
  automaticLines: OwnerStatementManualLineV1[]
): OwnerStatementManualLineV1[] {
  return [...automaticLines, ...filterUserManualLines(userLines)]
}
