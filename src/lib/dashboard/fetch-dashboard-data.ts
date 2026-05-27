import "server-only"

import {
  addDays,
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns"
import { ClientStatus } from "@prisma/client"
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
  const lastMonthEnd = endOfDay(endOfMonth(subMonths(today, 1)))
  const trendStart = startOfDay(startOfMonth(subMonths(today, 5)))
  const todayStart = startOfDay(today)
  const next7Days = endOfDay(addDays(today, 7))
  const scheduleFrom = startOfDay(subDays(today, 3))

  const month = today.getMonth() + 1
  const year = today.getFullYear()

  const [
    properties,
    currentMonthBookings,
    lastMonthBookings,
    trendBookings,
    scheduleBookings,
    activeClients,
    expenses,
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
      where: dashboardBookingOverlapWhere(currentMonthStart, currentMonthEnd),
      select: dashboardBookingSelect,
      orderBy: [{ check_in: "asc" }],
    }),
    prisma.booking.findMany({
      where: dashboardBookingOverlapWhere(lastMonthStart, lastMonthEnd),
      select: dashboardBookingSelect,
      orderBy: [{ check_in: "asc" }],
    }),
    prisma.booking.findMany({
      where: dashboardBookingOverlapWhere(trendStart, currentMonthEnd),
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
    prisma.statementExpense.findMany({
      where: { month, year },
      select: { property_id: true, total: true },
    }),
  ])

  return computeDashboardData({
    today,
    properties,
    currentMonthBookings,
    lastMonthBookings,
    trendBookings,
    scheduleBookings,
    activeClients,
    expenses,
  })
}
