import { parseISO } from "date-fns"
import {
  calendarYearMonthInTimeZone,
  STATEMENT_CALENDAR_TIMEZONE,
} from "@/lib/owner-statement/statement-eligibility"
import type { StatementBookingAllocationMode } from "@/types/statement"

export type StatementAllocationUiMode = "prorated" | "full_payment" | "manual"

export function bookingSpansMultipleMonths(checkIn: string, checkOut: string): boolean {
  const checkInDate = parseISO(checkIn)
  const checkOutDate = parseISO(checkOut)
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return false
  const start = calendarYearMonthInTimeZone(checkInDate, STATEMENT_CALENDAR_TIMEZONE)
  const end = calendarYearMonthInTimeZone(checkOutDate, STATEMENT_CALENDAR_TIMEZONE)
  return start.year !== end.year || start.month !== end.month
}

export function overrideRowToUiMode(
  override: { allocation_mode: StatementBookingAllocationMode } | null | undefined
): StatementAllocationUiMode {
  if (!override) return "prorated"
  if (override.allocation_mode === "FULL_PAYMENT") return "full_payment"
  return "manual"
}
