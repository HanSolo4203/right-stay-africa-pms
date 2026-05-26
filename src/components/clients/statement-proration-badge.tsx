"use client"

import { parseISO } from "date-fns"
import { calendarYearMonthInTimeZone, STATEMENT_CALENDAR_TIMEZONE } from "@/lib/owner-statement/statement-eligibility"

export function StatementProrationBadge({
  checkIn,
  checkOut,
  nights,
  totalNights,
  statementMonth,
  statementYear,
}: {
  checkIn: string
  checkOut: string
  nights: number
  totalNights: number
  statementMonth: number
  statementYear: number
}) {
  const percentage = totalNights > 0 ? Math.round((nights / totalNights) * 100) : 0
  const checkInDate = parseISO(checkIn)
  const checkOutDate = parseISO(checkOut)
  const startMonth = formatMonthYear(checkInDate)
  const endMonth = formatMonthYear(checkOutDate)
  const currentMonth = formatMonthYear(new Date(statementYear, statementMonth - 1, 1))

  const tooltip = `This booking spans ${startMonth} – ${endMonth}. Showing ${nights}/${totalNights} nights (${percentage}%) pro-rated for ${currentMonth}.`

  return (
    <span
      className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: "#fef3c7", color: "#92400e", borderRadius: 4 }}
      title={tooltip}
    >
      Pro-rated · {nights} of {totalNights} nights this month
      <span aria-hidden className="opacity-70">
        ⓘ
      </span>
    </span>
  )
}

function formatMonthYear(d: Date): string {
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-ZA", { month: "long", year: "numeric", timeZone: STATEMENT_CALENDAR_TIMEZONE })
}

export function bookingSpansMultipleMonths(checkIn: string, checkOut: string): boolean {
  const checkInDate = parseISO(checkIn)
  const checkOutDate = parseISO(checkOut)
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return false
  const start = calendarYearMonthInTimeZone(checkInDate, STATEMENT_CALENDAR_TIMEZONE)
  const end = calendarYearMonthInTimeZone(checkOutDate, STATEMENT_CALENDAR_TIMEZONE)
  return start.year !== end.year || start.month !== end.month
}

export function StatementManualOverrideBadge({ note }: { note: string }) {
  return (
    <span
      className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: "#ffedd5", color: "#c2410c", borderRadius: 4 }}
      title={note}
    >
      Manual override
      <span aria-hidden className="opacity-70">
        ⓘ
      </span>
    </span>
  )
}
