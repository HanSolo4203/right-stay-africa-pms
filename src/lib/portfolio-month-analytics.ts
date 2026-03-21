import { BookingSource, BookingStatus } from "@prisma/client"
import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns"
import { prisma } from "@/lib/prisma"
import {
  aggregateBookingAnalyticsRows,
  type PropertyAnalyticsSnapshot,
} from "@/lib/property-booking-analytics"

export type PortfolioMonthOffset = -1 | 0 | 1

export function parsePortfolioMonthParam(
  raw: Record<string, string | string[] | undefined> | undefined
): PortfolioMonthOffset {
  const sp = raw ?? {}
  const v = Array.isArray(sp.portfolio_month) ? sp.portfolio_month[0] : sp.portfolio_month
  if (v == null || v === "") return 0
  const s = String(v).toLowerCase().trim()
  if (s === "prev" || s === "-1" || s === "previous") return -1
  if (s === "next" || s === "1") return 1
  return 0
}

export function calendarMonthFromOffset(offset: PortfolioMonthOffset, ref: Date = new Date()) {
  const d = addMonths(startOfMonth(ref), offset)
  return {
    year: d.getFullYear(),
    monthIndex: d.getMonth(),
    label: format(d, "MMMM yyyy"),
  }
}

/** Serialized booking row for dashboard portfolio analytics (matches `BookingListRow` + property). */
export type PortfolioDashboardBookingRow = {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  num_guests: number
  source: BookingSource
  status: BookingStatus
  total: string
  nightly_rate: string
  notes: string | null
  channel_name: string | null
  csv_imported_at: string | null
  total_payout: string | null
  cleaning_fee: string | null
  gross_revenue: string | null
  net_revenue: string | null
  commission: string | null
  total_management_fee: string | null
  confirmation_code: string | null
  property_id: string
  property_name: string
}

export async function fetchPortfolioBookingsForCalendarMonth(
  year: number,
  monthIndex: number
): Promise<PortfolioDashboardBookingRow[]> {
  const monthStart = startOfDay(startOfMonth(new Date(year, monthIndex, 1)))
  const monthEnd = endOfDay(endOfMonth(monthStart))

  const rows = await prisma.booking.findMany({
    where: {
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
      },
      check_in: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    include: {
      property: { select: { id: true, name: true } },
    },
    orderBy: [{ check_in: "asc" }, { guest_name: "asc" }],
  })

  return rows.map((booking) => ({
    id: booking.id,
    guest_name: booking.guest_name,
    check_in: booking.check_in.toISOString(),
    check_out: booking.check_out.toISOString(),
    num_guests: booking.num_guests,
    source: booking.source,
    status: booking.status,
    total: booking.total.toString(),
    nightly_rate: booking.nightly_rate.toString(),
    notes: booking.notes,
    channel_name: booking.channel_name,
    csv_imported_at: booking.csv_imported_at?.toISOString() ?? null,
    total_payout: booking.total_payout?.toString() ?? null,
    cleaning_fee: booking.cleaning_fee?.toString() ?? null,
    gross_revenue: booking.gross_revenue?.toString() ?? null,
    net_revenue: booking.net_revenue?.toString() ?? null,
    commission: booking.commission?.toString() ?? null,
    total_management_fee: booking.total_management_fee?.toString() ?? null,
    confirmation_code: booking.confirmation_code,
    property_id: booking.property.id,
    property_name: booking.property.name,
  }))
}

/** All non-cancelled bookings with check-in in the given calendar year (portfolio-wide). */
export async function fetchPortfolioBookingsForCalendarYear(
  year: number
): Promise<PortfolioDashboardBookingRow[]> {
  const yearStart = startOfDay(startOfYear(new Date(year, 0, 1)))
  const yearEnd = endOfDay(endOfYear(yearStart))

  const rows = await prisma.booking.findMany({
    where: {
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
      },
      check_in: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    include: {
      property: { select: { id: true, name: true } },
    },
    orderBy: [{ check_in: "asc" }, { guest_name: "asc" }],
  })

  return rows.map((booking) => ({
    id: booking.id,
    guest_name: booking.guest_name,
    check_in: booking.check_in.toISOString(),
    check_out: booking.check_out.toISOString(),
    num_guests: booking.num_guests,
    source: booking.source,
    status: booking.status,
    total: booking.total.toString(),
    nightly_rate: booking.nightly_rate.toString(),
    notes: booking.notes,
    channel_name: booking.channel_name,
    csv_imported_at: booking.csv_imported_at?.toISOString() ?? null,
    total_payout: booking.total_payout?.toString() ?? null,
    cleaning_fee: booking.cleaning_fee?.toString() ?? null,
    gross_revenue: booking.gross_revenue?.toString() ?? null,
    net_revenue: booking.net_revenue?.toString() ?? null,
    commission: booking.commission?.toString() ?? null,
    total_management_fee: booking.total_management_fee?.toString() ?? null,
    confirmation_code: booking.confirmation_code,
    property_id: booking.property.id,
    property_name: booking.property.name,
  }))
}

export function buildPortfolioMonthSnapshot(
  rows: PortfolioDashboardBookingRow[],
  monthLabel: string
): PropertyAnalyticsSnapshot {
  const totals = aggregateBookingAnalyticsRows(rows)
  return {
    periodLabel: monthLabel,
    ...totals,
  }
}

export function buildPortfolioYearSnapshot(
  rows: PortfolioDashboardBookingRow[],
  year: number
): PropertyAnalyticsSnapshot {
  const totals = aggregateBookingAnalyticsRows(rows)
  return {
    periodLabel: String(year),
    ...totals,
  }
}
