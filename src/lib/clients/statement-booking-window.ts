import { BookingStatus, StatementSource } from "@prisma/client"
import { nextCalendarMonth } from "@/lib/owner-statement/statement-eligibility"

export const STATEMENT_ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
]

/** Calendar bounds for statement UI: selected month through end of next month. */
export function statementPeriodCalendarBounds(month: number, year: number) {
  const firstDay = new Date(year, month - 1, 1)
  const next = nextCalendarMonth(year, month)
  const lastDay = new Date(next.year, next.month, 0, 23, 59, 59, 999)
  return { firstDay, lastDay }
}

/**
 * Bookings needed for statement editing / totals: overlap the period window,
 * or are linked to a generated statement for this month/year.
 */
export function statementPeriodBookingWhere(month: number, year: number) {
  const { firstDay, lastDay } = statementPeriodCalendarBounds(month, year)
  return {
    status: { in: STATEMENT_ACTIVE_BOOKING_STATUSES },
    OR: [
      {
        check_in: { lte: lastDay },
        check_out: { gte: firstDay },
      },
      {
        owner_statement: {
          month,
          year,
          source: StatementSource.GENERATED,
        },
      },
    ],
  }
}
