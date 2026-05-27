import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  getDaysInMonth,
  isSameDay,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns"
import { getAnalyticsChannelLabel } from "@/lib/booking-channel-label"
import { isStatementActiveBookingStatus } from "@/lib/booking-status"
import { STATEMENT_ACTIVE_BOOKING_STATUSES } from "@/lib/clients/statement-booking-window"
import {
  allocationGrossRevenue,
  prorateBookingByMonth,
  type StatementBookingInput,
} from "@/lib/statement-calculator"
import type {
  DashboardAttentionItem,
  DashboardApiResponse,
  DashboardPropertyRow,
  DashboardUpcomingStay,
} from "@/lib/dashboard/types"

export { STATEMENT_ACTIVE_BOOKING_STATUSES }

export const dashboardBookingSelect = {
  id: true,
  property_id: true,
  guest_name: true,
  check_in: true,
  check_out: true,
  channel_name: true,
  source: true,
  status: true,
  owner_statement_id: true,
  accommodation_total: true,
  discount: true,
  extra_guest_charge: true,
  cleaning_fee: true,
  extra_charges: true,
  upsells: true,
  booking_taxes: true,
  commission: true,
  commission_tax: true,
  total_management_fee: true,
  payment_processing_fee: true,
  total_payout: true,
  gross_revenue: true,
  is_manual_override: true,
  manual_monthly_note: true,
} as const

export type DashboardBookingRow = {
  id: string
  property_id: string
  guest_name: string
  check_in: Date
  check_out: Date
  channel_name: string | null
  source: StatementBookingInput["source"]
  status: StatementBookingInput["status"]
} & Omit<
  StatementBookingInput,
  "id" | "guest_name" | "check_in" | "check_out" | "channel_name" | "source" | "status"
>

export type DashboardPropertyInput = {
  id: string
  name: string
  unit_number: string | null
  client: { name: string } | null
  owner: { full_name: string } | null
}

export type DashboardExpenseRow = {
  property_id: string
  total: { toString: () => string }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function num(v: { toString: () => string } | null | undefined): number {
  if (v == null) return 0
  const n = Number(v.toString())
  return Number.isFinite(n) ? n : 0
}

function bookingsOverlappingRange(rangeStart: Date, rangeEnd: Date) {
  return {
    status: { in: STATEMENT_ACTIVE_BOOKING_STATUSES },
    check_in: { lte: rangeEnd },
    check_out: { gte: rangeStart },
  }
}

export function dashboardBookingOverlapWhere(monthStart: Date, monthEnd: Date) {
  return bookingsOverlappingRange(monthStart, monthEnd)
}

type MonthSlice = {
  year: number
  month: number
  grossRevenue: number
  managementFees: number
  ownerPayouts: number
  bookingIds: Set<string>
  bookedNights: number
  byProperty: Map<
    string,
    {
      bookingIds: Set<string>
      bookedNights: number
      grossRevenue: number
      managementFee: number
      ownerPayout: number
      platform: string | null
    }
  >
  byPlatform: Map<string, { revenue: number; bookingIds: Set<string> }>
}

function emptyMonthSlice(): MonthSlice {
  return {
    year: 0,
    month: 0,
    grossRevenue: 0,
    managementFees: 0,
    ownerPayouts: 0,
    bookingIds: new Set(),
    bookedNights: 0,
    byProperty: new Map(),
    byPlatform: new Map(),
  }
}

function accumulateMonthSlice(
  slice: MonthSlice,
  bookings: DashboardBookingRow[],
  year: number,
  month: number
) {
  slice.year = year
  slice.month = month

  for (const booking of bookings) {
    if (!isStatementActiveBookingStatus(booking.status)) continue
    const allocations = prorateBookingByMonth(booking as StatementBookingInput).filter(
      (a) => a.year === year && a.month === month
    )
    if (allocations.length === 0) continue

    const platform = getAnalyticsChannelLabel(booking.channel_name, booking.source)
    let prop = slice.byProperty.get(booking.property_id)
    if (!prop) {
      prop = {
        bookingIds: new Set(),
        bookedNights: 0,
        grossRevenue: 0,
        managementFee: 0,
        ownerPayout: 0,
        platform: null,
      }
      slice.byProperty.set(booking.property_id, prop)
    }

    for (const a of allocations) {
      const gross = allocationGrossRevenue(a)
      const accommodation = a.accommodation_total
      const mgmt = a.total_management_fee
      const payout = a.total_payout

      slice.grossRevenue += accommodation
      slice.managementFees += mgmt
      slice.ownerPayouts += payout
      slice.bookedNights += a.nights
      slice.bookingIds.add(booking.id)

      prop.bookingIds.add(booking.id)
      prop.bookedNights += a.nights
      prop.grossRevenue += gross
      prop.managementFee += mgmt
      prop.ownerPayout += payout
      prop.platform = platform

      const plat = slice.byPlatform.get(platform) ?? { revenue: 0, bookingIds: new Set<string>() }
      plat.revenue += gross
      plat.bookingIds.add(booking.id)
      slice.byPlatform.set(platform, plat)
    }
  }

  slice.grossRevenue = round2(slice.grossRevenue)
  slice.managementFees = round2(slice.managementFees)
  slice.ownerPayouts = round2(slice.ownerPayouts)
}

function expenseTotalByProperty(expenses: DashboardExpenseRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of expenses) {
    const t = num(e.total)
    map.set(e.property_id, round2((map.get(e.property_id) ?? 0) + t))
  }
  return map
}

function resolvePropertyStatus(
  bookings: DashboardBookingRow[],
  today: Date
): Pick<DashboardPropertyRow, "status" | "currentGuest" | "nextCheckin"> {
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)
  const active = bookings.filter((b) => isStatementActiveBookingStatus(b.status))

  const checkOutToday = active.some((b) => isSameDay(b.check_out, today))
  const checkInToday = active.some((b) => isSameDay(b.check_in, today))
  const occupiedBooking = active.find(
    (b) => b.check_in <= todayEnd && b.check_out > todayStart
  )

  if (checkOutToday) {
    return {
      status: "check-out",
      currentGuest: occupiedBooking?.guest_name ?? null,
      nextCheckin: null,
    }
  }
  if (checkInToday) {
    const arriving = active.find((b) => isSameDay(b.check_in, today))
    return {
      status: "check-in",
      currentGuest: arriving?.guest_name ?? null,
      nextCheckin: null,
    }
  }
  if (occupiedBooking) {
    return {
      status: "occupied",
      currentGuest: occupiedBooking.guest_name,
      nextCheckin: null,
    }
  }

  const next = active
    .filter((b) => b.check_in >= todayStart)
    .sort((a, b) => a.check_in.getTime() - b.check_in.getTime())[0]

  return {
    status: "vacant",
    currentGuest: null,
    nextCheckin: next ? next.check_in.toISOString().slice(0, 10) : null,
  }
}

function buildAttentionItems(input: {
  properties: DashboardPropertyInput[]
  propertyBreakdown: DashboardPropertyRow[]
  scheduleBookings: Array<
    DashboardBookingRow & { property: { id: string; name: string } }
  >
  today: Date
  monthLabel: string
}): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = []
  const todayStart = startOfDay(input.today)
  const threeDaysAgo = startOfDay(subDays(input.today, 3))

  for (const row of input.propertyBreakdown) {
    if (row.bookingCount === 0) {
      items.push({
        propertyId: row.propertyId,
        propertyName: row.propertyName,
        issue: `No bookings recorded for ${input.monthLabel}`,
      })
    }
  }

  const byProperty = new Map<string, typeof input.scheduleBookings>()
  for (const b of input.scheduleBookings) {
    if (!isStatementActiveBookingStatus(b.status)) continue
    const list = byProperty.get(b.property_id) ?? []
    list.push(b)
    byProperty.set(b.property_id, list)
  }

  for (const p of input.properties) {
    const bookings = byProperty.get(p.id) ?? []
    const recentDepartures = bookings
      .filter((b) => {
        const out = startOfDay(b.check_out)
        return out >= threeDaysAgo && out < todayStart
      })
      .sort((a, b) => b.check_out.getTime() - a.check_out.getTime())

    const lastDeparture = recentDepartures[0]
    if (!lastDeparture) continue

    const hasFollowUp = bookings.some(
      (b) =>
        b.id !== lastDeparture.id &&
        b.check_in >= lastDeparture.check_out &&
        b.check_in <= endOfDay(input.today)
    )
    if (hasFollowUp) continue

    const daysAgo = differenceInCalendarDays(todayStart, startOfDay(lastDeparture.check_out))
    const dayLabel = daysAgo === 1 ? "1 day" : `${daysAgo} days`
    items.push({
      propertyId: p.id,
      propertyName: p.name,
      issue: `Guest checked out ${dayLabel} ago — verify property status`,
    })
  }

  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.propertyId}:${item.issue}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sortPropertyBreakdown(rows: DashboardPropertyRow[]): DashboardPropertyRow[] {
  const withBookings = rows.filter((r) => r.bookingCount > 0).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
  const without = rows.filter((r) => r.bookingCount === 0).sort((a, b) => a.propertyName.localeCompare(b.propertyName))
  return [...withBookings, ...without]
}

function buildUpcomingStay(
  booking: DashboardBookingRow & { property?: { id: string; name: string } },
  propertyName: string
): DashboardUpcomingStay {
  const nights = Math.max(0, differenceInCalendarDays(booking.check_out, booking.check_in))
  return {
    bookingId: booking.id,
    guestName: booking.guest_name,
    propertyName,
    propertyId: booking.property_id,
    checkIn: booking.check_in.toISOString(),
    checkOut: booking.check_out.toISOString(),
    nights,
    platform: getAnalyticsChannelLabel(booking.channel_name, booking.source),
  }
}

export function computeDashboardData(input: {
  today?: Date
  properties: DashboardPropertyInput[]
  currentMonthBookings: DashboardBookingRow[]
  lastMonthBookings: DashboardBookingRow[]
  trendBookings: DashboardBookingRow[]
  scheduleBookings: Array<
    DashboardBookingRow & { property: { id: string; name: string } }
  >
  activeClients: number
  expenses: DashboardExpenseRow[]
}): DashboardApiResponse {
  const today = input.today ?? new Date()
  const currentMonthStart = startOfDay(startOfMonth(today))
  const currentMonthEnd = endOfDay(endOfMonth(today))
  const lastMonthStart = startOfDay(startOfMonth(subMonths(today, 1)))
  const lastMonthEnd = endOfDay(endOfMonth(subMonths(today, 1)))
  const next7Days = endOfDay(addDays(today, 7))
  const todayStart = startOfDay(today)

  const currentYear = currentMonthStart.getFullYear()
  const currentMonth = currentMonthStart.getMonth() + 1
  const lastYear = lastMonthStart.getFullYear()
  const lastMonth = lastMonthStart.getMonth() + 1

  const daysInCurrentMonth = getDaysInMonth(currentMonthStart)
  const availableNights = input.properties.length * daysInCurrentMonth

  const currentSlice = emptyMonthSlice()
  const lastSlice = emptyMonthSlice()
  accumulateMonthSlice(currentSlice, input.currentMonthBookings, currentYear, currentMonth)
  accumulateMonthSlice(lastSlice, input.lastMonthBookings, lastYear, lastMonth)

  const expenseByProperty = expenseTotalByProperty(input.expenses)
  let portfolioExpenses = 0
  for (const t of expenseByProperty.values()) portfolioExpenses += t
  portfolioExpenses = round2(portfolioExpenses)

  const currentOwnerPayouts = round2(currentSlice.ownerPayouts - portfolioExpenses)

  const scheduleByProperty = new Map<string, DashboardBookingRow[]>()
  for (const b of input.scheduleBookings) {
    const list = scheduleByProperty.get(b.property_id) ?? []
    list.push(b)
    scheduleByProperty.set(b.property_id, list)
  }

  const propertyBreakdown: DashboardPropertyRow[] = input.properties.map((p) => {
    const row = currentSlice.byProperty.get(p.id)
    const bookedNights = row?.bookedNights ?? 0
    const propertyExpenses = expenseByProperty.get(p.id) ?? 0
    const ownerName = p.client?.name?.trim() || p.owner?.full_name?.trim() || null
    const platform: string | null = row?.platform ?? null
    const statusFields = resolvePropertyStatus(scheduleByProperty.get(p.id) ?? [], today)

    return {
      propertyId: p.id,
      propertyName: p.name,
      ownerName,
      unitNumber: p.unit_number,
      bookingCount: row?.bookingIds.size ?? 0,
      bookedNights,
      daysInMonth: daysInCurrentMonth,
      occupancyRate:
        daysInCurrentMonth > 0 ? round2((bookedNights / daysInCurrentMonth) * 100) : 0,
      grossRevenue: row?.grossRevenue ?? 0,
      managementFee: row?.managementFee ?? 0,
      ownerPayout: round2((row?.ownerPayout ?? 0) - propertyExpenses),
      platform,
      ...statusFields,
    }
  })

  const propertiesWithBookingsThisMonth = propertyBreakdown.filter((p) => p.bookingCount > 0).length

  const monthLabel = format(currentMonthStart, "MMMM yyyy")

  const checkinsNext7Days = input.scheduleBookings
    .filter(
      (b) =>
        isStatementActiveBookingStatus(b.status) &&
        b.check_in >= todayStart &&
        b.check_in <= next7Days
    )
    .sort((a, b) => a.check_in.getTime() - b.check_in.getTime())
    .map((b) => buildUpcomingStay(b, b.property.name))

  const checkoutsNext7Days = input.scheduleBookings
    .filter(
      (b) =>
        isStatementActiveBookingStatus(b.status) &&
        b.check_out >= todayStart &&
        b.check_out <= next7Days
    )
    .sort((a, b) => a.check_out.getTime() - b.check_out.getTime())
    .map((b) => buildUpcomingStay(b, b.property.name))

  const totalGrossForPlatform = [...currentSlice.byPlatform.values()].reduce(
    (s, p) => s + p.revenue,
    0
  )
  const revenueByPlatform = [...currentSlice.byPlatform.entries()]
    .map(([platform, data]) => ({
      platform,
      revenue: round2(data.revenue),
      bookings: data.bookingIds.size,
      percentage:
        totalGrossForPlatform > 0 ? round2((data.revenue / totalGrossForPlatform) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const trendStart = startOfMonth(subMonths(today, 5))
  const trendMonths: Array<{ year: number; month: number; label: string }> = []
  for (let i = 0; i < 6; i++) {
    const d = addMonths(trendStart, i)
    trendMonths.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, "MMM"),
    })
  }

  const revenueTrend = trendMonths.map(({ year, month, label }) => {
    const slice = emptyMonthSlice()
    accumulateMonthSlice(slice, input.trendBookings, year, month)
    return {
      month: label,
      grossRevenue: slice.grossRevenue,
      managementFees: slice.managementFees,
      ownerPayouts: slice.ownerPayouts,
    }
  })

  const currentOccupancy =
    availableNights > 0 ? round2((currentSlice.bookedNights / availableNights) * 100) : 0
  const lastOccupancyDenominator = input.properties.length * getDaysInMonth(lastMonthStart)
  const lastOccupancy =
    lastOccupancyDenominator > 0
      ? round2((lastSlice.bookedNights / lastOccupancyDenominator) * 100)
      : 0

  return {
    kpis: {
      currentMonth: {
        grossRevenue: currentSlice.grossRevenue,
        managementFees: currentSlice.managementFees,
        ownerPayouts: currentOwnerPayouts,
        bookingCount: currentSlice.bookingIds.size,
        bookedNights: currentSlice.bookedNights,
        availableNights,
        occupancyRate: currentOccupancy,
      },
      lastMonth: {
        grossRevenue: lastSlice.grossRevenue,
        managementFees: lastSlice.managementFees,
        ownerPayouts: lastSlice.ownerPayouts,
        bookingCount: lastSlice.bookingIds.size,
        occupancyRate: lastOccupancy,
      },
    },
    portfolio: {
      totalProperties: input.properties.length,
      activeClients: input.activeClients,
      propertiesWithBookingsThisMonth,
      propertiesWithNoBookingsThisMonth:
        input.properties.length - propertiesWithBookingsThisMonth,
    },
    upcoming: { checkinsNext7Days, checkoutsNext7Days },
    propertyBreakdown: sortPropertyBreakdown(propertyBreakdown),
    attention: buildAttentionItems({
      properties: input.properties,
      propertyBreakdown,
      scheduleBookings: input.scheduleBookings,
      today,
      monthLabel,
    }),
    revenueByPlatform,
    revenueTrend,
    generatedAt: new Date().toISOString(),
  }
}
