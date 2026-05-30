import "server-only"

import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns"
import { ClientStatus } from "@prisma/client"
import {
  aggregatePortfolioFromClients,
  buildPreviewPortfolioFromBookings,
} from "@/lib/clients/portfolio-period-summary"
import { loadClientsWithStatements } from "@/lib/clients/statement-service"
import { prisma } from "@/lib/prisma"
import { STATEMENT_ACTIVE_BOOKING_STATUSES } from "@/lib/clients/statement-booking-window"
import {
  computeDashboardData,
  dashboardBookingOverlapWhere,
  dashboardBookingSelect,
} from "@/lib/dashboard/compute-dashboard-data"
import type { DashboardApiResponse } from "@/lib/dashboard/types"

export async function fetchDashboardData(today: Date = new Date()): Promise<DashboardApiResponse> {
  const currentMonthStart = startOfDay(startOfMonth(today))
  const currentMonthEnd = endOfDay(endOfMonth(today))
  const lastMonthStart = startOfDay(startOfMonth(subMonths(today, 1)))
  const trendStart = startOfDay(startOfMonth(subMonths(today, 5)))
  const todayStart = startOfDay(today)
  const next7Days = endOfDay(addDays(today, 7))
  const scheduleFrom = startOfDay(subDays(today, 3))

  const month = today.getMonth() + 1
  const year = today.getFullYear()
  const lastMonth = lastMonthStart.getMonth() + 1
  const lastYear = lastMonthStart.getFullYear()

  const trendPeriods = Array.from({ length: 6 }, (_, i) => {
    const d = addMonths(trendStart, i)
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: format(d, "MMM") }
  })

  const [
    properties,
    trendBookings,
    currentMonthBookings,
    scheduleBookings,
    activeClients,
  ] = await Promise.all([
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit_number: true,
        client: { select: { name: true } },
        owner: { select: { full_name: true } },
      },
    }),
    prisma.booking.findMany({
      where: dashboardBookingOverlapWhere(trendStart, currentMonthEnd),
      select: dashboardBookingSelect,
    }),
    prisma.booking.findMany({
      where: dashboardBookingOverlapWhere(currentMonthStart, currentMonthEnd),
      select: dashboardBookingSelect,
    }),
    prisma.booking.findMany({
      where: {
        status: { in: STATEMENT_ACTIVE_BOOKING_STATUSES },
        check_in: { lte: next7Days },
        check_out: { gte: scheduleFrom },
      },
      select: {
        ...dashboardBookingSelect,
        property: { select: { id: true, name: true } },
      },
      orderBy: [{ check_in: "asc" }],
    }),
    prisma.client.count({ where: { status: ClientStatus.ACTIVE } }),
  ])

  // Only current + last month need full statement previews; trend uses booking proration.
  const [currentMonthClients, lastMonthClients] = await Promise.all([
    loadClientsWithStatements(month, year, { omitBookings: true }),
    loadClientsWithStatements(lastMonth, lastYear, { omitBookings: true }),
  ])

  const propertyCount = properties.length
  const currentPortfolio = aggregatePortfolioFromClients(currentMonthClients, month, year)
  const lastPortfolio = aggregatePortfolioFromClients(lastMonthClients, lastMonth, lastYear)
  const trendPortfolios = trendPeriods.map(({ month: m, year: y, label }) => ({
    label,
    summary: buildPreviewPortfolioFromBookings(trendBookings, propertyCount, m, y),
  }))

  return computeDashboardData({
    today,
    properties,
    currentPortfolio,
    lastPortfolio,
    trendPortfolios,
    currentMonthBookings,
    scheduleBookings,
    activeClients,
  })
}
