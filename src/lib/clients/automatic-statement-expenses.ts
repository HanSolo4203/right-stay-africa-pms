import type { OwnerStatementManualLineV1 } from "@/lib/owner-statement/types"
import {
  buildCleaningFeeExpenseLines,
  buildWelcomePackExpenseLines,
} from "@/lib/clients/statement-financials"
import { statementExpenseItemsToManualLines } from "@/lib/clients/statement-expense-mappers"

export type BookingForAutomaticExpenses = {
  id: string
  guestName: string
  cleaningFee: number
}

const AUTOMATIC_ID_PREFIXES = ["welcome-pack:", "cleaning:"] as const

export function isAutomaticExpenseLineId(id: string): boolean {
  return AUTOMATIC_ID_PREFIXES.some((p) => id.startsWith(p))
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
