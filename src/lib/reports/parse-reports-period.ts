import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns"
import type { ReportsPeriodKind } from "@/lib/reports/types"

export type ResolvedReportsPeriod = {
  kind: ReportsPeriodKind
  start: Date
  end: Date
  label: string
  daysInPeriod: number
  month?: number
  year: number
  from?: string
  to?: string
}

function parseYmd(value: string): Date | null {
  const d = parseISO(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function parseReportsPeriodFromSearchParams(
  searchParams: URLSearchParams,
  today: Date = new Date()
): ResolvedReportsPeriod | { error: string } {
  const period = (searchParams.get("period") ?? "month") as ReportsPeriodKind
  const nowYear = today.getFullYear()
  const nowMonth = today.getMonth() + 1

  if (period === "month") {
    const month = Number(searchParams.get("month") ?? nowMonth)
    const year = Number(searchParams.get("year") ?? nowYear)
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return { error: "Invalid month." }
    }
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return { error: "Invalid year." }
    }
    const start = startOfDay(startOfMonth(new Date(year, month - 1, 1)))
    const end = endOfDay(endOfMonth(start))
    const label = format(start, "MMMM yyyy")
    return {
      kind: "month",
      start,
      end,
      label,
      daysInPeriod: differenceInCalendarDays(end, start) + 1,
      month,
      year,
    }
  }

  if (period === "year") {
    const year = Number(searchParams.get("year") ?? nowYear)
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return { error: "Invalid year." }
    }
    const start = startOfDay(startOfYear(new Date(year, 0, 1)))
    const end = endOfDay(endOfYear(start))
    return {
      kind: "year",
      start,
      end,
      label: String(year),
      daysInPeriod: differenceInCalendarDays(end, start) + 1,
      year,
    }
  }

  if (period === "custom") {
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    if (!from || !to) {
      return { error: "Custom period requires from and to dates." }
    }
    const fromDate = parseYmd(from)
    const toDate = parseYmd(to)
    if (!fromDate || !toDate) {
      return { error: "Invalid from or to date." }
    }
    const start = startOfDay(fromDate)
    const end = endOfDay(toDate)
    if (start > end) {
      return { error: "from must be on or before to." }
    }
    const label = `${format(start, "MMM")}–${format(end, "MMM yyyy")}`
    return {
      kind: "custom",
      start,
      end,
      label,
      daysInPeriod: differenceInCalendarDays(end, start) + 1,
      year: end.getFullYear(),
      from,
      to,
    }
  }

  return { error: "Invalid period. Use month, year, or custom." }
}

/** Prior calendar month (or year / shifted custom window) for period-over-period comparison. */
export function previousCalendarPeriod(period: ResolvedReportsPeriod): ResolvedReportsPeriod {
  if (period.kind === "month" && period.month) {
    const d = subMonths(new Date(period.year, period.month - 1, 1), 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const start = startOfDay(startOfMonth(d))
    const end = endOfDay(endOfMonth(start))
    return {
      kind: "month",
      start,
      end,
      label: format(start, "MMMM yyyy"),
      daysInPeriod: differenceInCalendarDays(end, start) + 1,
      month,
      year,
    }
  }

  if (period.kind === "year") {
    const year = period.year - 1
    const start = startOfDay(startOfYear(new Date(year, 0, 1)))
    const end = endOfDay(endOfYear(start))
    return {
      kind: "year",
      start,
      end,
      label: String(year),
      daysInPeriod: differenceInCalendarDays(end, start) + 1,
      year,
    }
  }

  const spanDays = period.daysInPeriod
  const prevEnd = endOfDay(subDays(period.start, 1))
  const prevStart = startOfDay(subDays(prevEnd, spanDays - 1))
  return {
    kind: "custom",
    start: prevStart,
    end: prevEnd,
    label: `${format(prevStart, "MMM")}–${format(prevEnd, "MMM yyyy")}`,
    daysInPeriod: spanDays,
    year: prevEnd.getFullYear(),
    from: format(prevStart, "yyyy-MM-dd"),
    to: format(prevEnd, "yyyy-MM-dd"),
  }
}

/** Same period one year earlier (year-over-year). */
export function yearOverYearPeriod(period: ResolvedReportsPeriod): ResolvedReportsPeriod {
  if (period.kind === "month" && period.month) {
    const d = subYears(new Date(period.year, period.month - 1, 1), 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const start = startOfDay(startOfMonth(d))
    const end = endOfDay(endOfMonth(start))
    return {
      kind: "month",
      start,
      end,
      label: format(start, "MMMM yyyy"),
      daysInPeriod: differenceInCalendarDays(end, start) + 1,
      month,
      year,
    }
  }

  if (period.kind === "year") {
    const year = period.year - 1
    const start = startOfDay(startOfYear(new Date(year, 0, 1)))
    const end = endOfDay(endOfYear(start))
    return {
      kind: "year",
      start,
      end,
      label: String(year),
      daysInPeriod: differenceInCalendarDays(end, start) + 1,
      year,
    }
  }

  const prevStart = startOfDay(subYears(period.start, 1))
  const prevEnd = endOfDay(subYears(period.end, 1))
  return {
    kind: "custom",
    start: prevStart,
    end: prevEnd,
    label: period.label,
    daysInPeriod: period.daysInPeriod,
    year: prevEnd.getFullYear(),
    from: format(prevStart, "yyyy-MM-dd"),
    to: format(prevEnd, "yyyy-MM-dd"),
  }
}

/** @deprecated Use {@link previousCalendarPeriod} or {@link yearOverYearPeriod}. */
export function previousComparablePeriod(period: ResolvedReportsPeriod): ResolvedReportsPeriod {
  return yearOverYearPeriod(period)
}
