/**
 * Owner statements are keyed by a calendar month, but payouts for a stay that
 * checks in on the last day of the prior month are often included on the
 * following month's statement. Bookings may be attached if check-in is in the
 * statement month or the immediately preceding calendar month.
 *
 * Check-in calendar days use Africa/Johannesburg so the browser and server
 * (often UTC in production) agree — using each environment's local Date getters
 * does not.
 */
export const STATEMENT_CALENDAR_TIMEZONE = "Africa/Johannesburg"

export function previousCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

export function nextCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month >= 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

export function calendarYearMonthInTimeZone(d: Date, timeZone: string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(d)
  const y = Number(parts.find((p) => p.type === "year")?.value)
  const m = Number(parts.find((p) => p.type === "month")?.value)
  return { year: y, month: m }
}

/** Count occupied nights per calendar month (Johannesburg) for a stay. */
export function nightsByCalendarMonth(
  checkIn: Date,
  checkOut: Date
): Array<{ year: number; month: number; nights: number }> {
  const totalNights = Math.max(
    0,
    Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  )
  if (totalNights <= 0) return []

  const counts = new Map<string, { year: number; month: number; nights: number }>()
  for (let i = 0; i < totalNights; i++) {
    const nightDate = new Date(checkIn.getTime() + i * 86400000)
    const { year, month } = calendarYearMonthInTimeZone(nightDate, STATEMENT_CALENDAR_TIMEZONE)
    const key = `${year}-${month}`
    const existing = counts.get(key)
    if (existing) existing.nights += 1
    else counts.set(key, { year, month, nights: 1 })
  }

  return Array.from(counts.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  )
}

/** True if any occupied night falls in `year`/`month` (Johannesburg). */
export function bookingHasNightsInCalendarMonth(
  checkIn: Date,
  checkOut: Date,
  year: number,
  month: number
): boolean {
  return nightsByCalendarMonth(checkIn, checkOut).some((m) => m.year === year && m.month === month)
}

/** True if check-in falls on a calendar day in `year`/`month` (Johannesburg). */
export function checkInInCalendarMonth(checkIn: Date, year: number, month: number): boolean {
  const { year: cy, month: cm } = calendarYearMonthInTimeZone(checkIn, STATEMENT_CALENDAR_TIMEZONE)
  return cy === year && cm === month
}

export function checkInAllowedOnOwnerStatement(
  checkIn: Date,
  statementYear: number,
  statementMonth: number
): boolean {
  const prev = previousCalendarMonth(statementYear, statementMonth)
  return (
    checkInInCalendarMonth(checkIn, statementYear, statementMonth) ||
    checkInInCalendarMonth(checkIn, prev.year, prev.month)
  )
}

/**
 * Receipt rows are sent to the client as `date.toISOString().split("T")[0]` (UTC
 * calendar date). Statement month filtering must use the same interpretation.
 */
export function receiptYmdInStatementMonth(ymd: string, year: number, month: number): boolean {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(ymd.trim())
  if (!m) return false
  return Number(m[1]) === year && Number(m[2]) === month
}
