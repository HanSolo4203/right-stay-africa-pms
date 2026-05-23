/** Active booking statuses for statements (matches Prisma BookingStatus). */
export const STATEMENT_ACTIVE_BOOKING_STATUSES = [
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
] as const

export function isStatementActiveBookingStatus(status: string): boolean {
  return (STATEMENT_ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status)
}
