import { BookingSource, BookingStatus } from "@prisma/client"
import { differenceInCalendarDays, format, parseISO } from "date-fns"

export type PropertyAnalyticsPeriod = "month" | "year" | "last_year" | "all"

export type PropertyAnalyticsSnapshot = {
  periodLabel: string
  bookingsMade: number
  nightsBooked: number
  grossRevenue: number
  totalPayout: number
  commission: number
  managementFees: number
}

/** Minimum fields for period filtering & totals */
export type PropertyBookingAnalyticsRow = {
  check_in: string
  check_out: string
  status: BookingStatus
  gross_revenue: string | null
  total_payout: string | null
  total: string
  commission: string | null
  total_management_fee: string | null
}

/** Row shape for table + channel charts (matches CSV import fields) */
export type PropertyAnalyticsDetailRow = PropertyBookingAnalyticsRow & {
  id: string
  guest_name: string
  num_guests: number
  source: BookingSource
  channel_name: string | null
  confirmation_code: string | null
  net_revenue: string | null
  cleaning_fee: string | null
  csv_imported_at: string | null
}

export type AnalyticsMonthPoint = {
  key: string
  label: string
  gross: number
  payout: number
  bookingCount: number
  nights: number
}

export type ChannelGrossSlice = {
  name: string
  gross: number
}

export type PerBookingBarPoint = {
  id: string
  label: string
  gross: number
  payout: number
  nights: number
}

function num(s: string | null | undefined): number {
  if (s == null || s === "") return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const ACTIVE_STATUSES = new Set<BookingStatus>([
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
])

const SOURCE_LABEL: Record<BookingSource, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  DIRECT: "Direct",
  OTHER: "Other",
}

export function getAnalyticsChannelLabel(
  channelName: string | null | undefined,
  source: BookingSource
): string {
  const raw = channelName?.trim()
  if (raw) {
    const key = raw.toLowerCase()
    if (key.includes("airbnb")) return "Airbnb"
    if (key.includes("booking")) return "Booking.com"
    if (key === "uplisting" || key === "direct" || key.includes("direct")) return "Direct"
    return raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return SOURCE_LABEL[source]
}

export function filterBookingsInAnalyticsPeriod<T extends PropertyBookingAnalyticsRow>(
  rows: T[],
  period: PropertyAnalyticsPeriod,
  referenceDate: Date = new Date()
): T[] {
  const y = referenceDate.getFullYear()
  const m = referenceDate.getMonth()

  return rows.filter((b) => {
    if (!ACTIVE_STATUSES.has(b.status)) return false
    const ci = parseISO(b.check_in)
    if (Number.isNaN(ci.getTime())) return false
    if (period === "month") {
      return ci.getFullYear() === y && ci.getMonth() === m
    }
    if (period === "year") {
      return ci.getFullYear() === y
    }
    if (period === "last_year") {
      return ci.getFullYear() === y - 1
    }
    return true
  })
}

export type BookingAnalyticsTotals = Omit<PropertyAnalyticsSnapshot, "periodLabel">

/** Sum metrics for an already-filtered list of active bookings. */
export function aggregateBookingAnalyticsRows(filtered: PropertyBookingAnalyticsRow[]): BookingAnalyticsTotals {
  let bookingsMade = 0
  let nightsBooked = 0
  let grossRevenue = 0
  let totalPayout = 0
  let commission = 0
  let managementFees = 0

  for (const b of filtered) {
    const co = parseISO(b.check_out)
    const nights = Number.isNaN(co.getTime()) ? 0 : Math.max(0, differenceInCalendarDays(co, parseISO(b.check_in)))

    bookingsMade += 1
    nightsBooked += nights
    grossRevenue += num(b.gross_revenue)
    totalPayout += num(b.total_payout) || num(b.total)
    commission += num(b.commission)
    managementFees += num(b.total_management_fee)
  }

  return {
    bookingsMade,
    nightsBooked,
    grossRevenue,
    totalPayout,
    commission,
    managementFees,
  }
}

/**
 * Aggregates non-cancelled bookings whose check-in falls in the selected window.
 */
export function computePropertyBookingAnalytics(
  rows: PropertyBookingAnalyticsRow[],
  period: PropertyAnalyticsPeriod,
  referenceDate: Date = new Date()
): PropertyAnalyticsSnapshot {
  const y = referenceDate.getFullYear()

  let periodLabel: string
  if (period === "month") {
    periodLabel = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(referenceDate)
  } else if (period === "year") {
    periodLabel = String(y)
  } else if (period === "last_year") {
    periodLabel = String(y - 1)
  } else {
    periodLabel = "All time"
  }

  const filtered = filterBookingsInAnalyticsPeriod(rows, period, referenceDate)
  const totals = aggregateBookingAnalyticsRows(filtered)

  return {
    periodLabel,
    ...totals,
  }
}

export function buildMonthlyPerformanceSeries<T extends PropertyBookingAnalyticsRow>(
  rows: T[]
): AnalyticsMonthPoint[] {
  const map = new Map<
    string,
    { gross: number; payout: number; count: number; nights: number }
  >()

  for (const b of rows) {
    const ci = parseISO(b.check_in)
    if (Number.isNaN(ci.getTime())) continue
    const key = format(ci, "yyyy-MM")
    const co = parseISO(b.check_out)
    const nights = Number.isNaN(co.getTime()) ? 0 : Math.max(0, differenceInCalendarDays(co, ci))
    const prev = map.get(key) ?? { gross: 0, payout: 0, count: 0, nights: 0 }
    prev.gross += num(b.gross_revenue)
    prev.payout += num(b.total_payout) || num(b.total)
    prev.count += 1
    prev.nights += nights
    map.set(key, prev)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: format(parseISO(`${key}-01`), "MMM yyyy"),
      gross: v.gross,
      payout: v.payout,
      bookingCount: v.count,
      nights: v.nights,
    }))
}

export function buildChannelGrossBreakdown(rows: PropertyAnalyticsDetailRow[]): ChannelGrossSlice[] {
  const map = new Map<string, number>()
  for (const b of rows) {
    const label = getAnalyticsChannelLabel(b.channel_name, b.source)
    map.set(label, (map.get(label) ?? 0) + num(b.gross_revenue))
  }
  return [...map.entries()]
    .map(([name, gross]) => ({ name, gross }))
    .filter((x) => x.gross > 0)
    .sort((a, b) => b.gross - a.gross)
}

const MAX_PER_BOOKING_BARS = 14

type PerBookingBarSource = PropertyAnalyticsDetailRow & { property_name?: string }

export function buildPerBookingGrossBars(rows: PerBookingBarSource[]): PerBookingBarPoint[] {
  const sorted = [...rows].sort(
    (a, b) => num(b.gross_revenue) - num(a.gross_revenue)
  )
  return sorted.slice(0, MAX_PER_BOOKING_BARS).map((b) => {
    const co = parseISO(b.check_out)
    const ci = parseISO(b.check_in)
    const nights = Number.isNaN(co.getTime()) || Number.isNaN(ci.getTime())
      ? 0
      : Math.max(0, differenceInCalendarDays(co, ci))
    const name = b.guest_name.trim() || "Guest"
    const prop = b.property_name?.trim()
    let label: string
    if (prop) {
      const g = name.length > 14 ? `${name.slice(0, 12)}…` : name
      const p = prop.length > 14 ? `${prop.slice(0, 12)}…` : prop
      label = `${g} · ${p}`
    } else {
      label = name.length > 22 ? `${name.slice(0, 20)}…` : name
    }
    return {
      id: b.id,
      label,
      gross: num(b.gross_revenue),
      payout: num(b.total_payout) || num(b.total),
      nights,
    }
  })
}

/** Prefer monthly bars when multiple months exist or there are too many stays for a readable per-booking chart */
export function shouldUseMonthlyTrendChart(
  monthlySeries: AnalyticsMonthPoint[],
  bookingCount: number
): boolean {
  if (monthlySeries.length >= 2) return true
  if (bookingCount > 14) return true
  return false
}
