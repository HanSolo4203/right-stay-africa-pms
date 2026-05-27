import { endOfDay, endOfMonth, startOfDay } from "date-fns"
import type { PortfolioPeriodSummary } from "@/lib/clients/portfolio-period-summary"
import { portfolioDaysInMonth } from "@/lib/clients/portfolio-period-summary"
import {
  combinePreviewMetrics,
  enumerateCalendarMonthsInPeriod,
  feeTotalsFromStatementClients,
  platformBreakdownFromStatementClients,
  portfolioMonthKey,
  previewMetricsFromPortfolio,
  resolvePortfolioMetricsForPeriod,
  trendMonthsEndingAt,
  type PortfolioPreviewMetrics,
} from "@/lib/reports/portfolio-reports"
import {
  previousCalendarPeriod,
  yearOverYearPeriod,
  type ResolvedReportsPeriod,
} from "@/lib/reports/parse-reports-period"
import type { ReportsSummaryResponse } from "@/lib/reports/types"
import type { StatementBookingInput } from "@/lib/statement-calculator"
import type { ClientStatementSummary } from "@/types/statement"

export type ReportsBookingRow = StatementBookingInput & {
  property_id: string
  guest_name: string
}

export type ReportsPropertyRow = {
  id: string
  name: string
  unit_number: string | null
  client: { id: string; name: string } | null
}

export type ReportsExpenseRow = {
  property_id: string
  client_id: string
  total: { toString: () => string }
  month: number
  year: number
}

export type ReportsPortfolioInput = {
  byMonth: Map<string, PortfolioPeriodSummary>
  clientsByMonth: Map<string, ClientStatementSummary[]>
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function num(v: { toString: () => string } | null | undefined): number {
  if (v == null) return 0
  const n = Number(v.toString())
  return Number.isFinite(n) ? n : 0
}

function growthPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return round2(((current - previous) / previous) * 100)
}

function topN<T>(items: T[], n: number, by: (item: T) => number): T[] {
  return [...items].sort((a, b) => by(b) - by(a)).slice(0, n)
}

function expenseInPeriod(
  expense: ReportsExpenseRow,
  period: ResolvedReportsPeriod
): boolean {
  const monthStart = startOfDay(new Date(expense.year, expense.month - 1, 1))
  const monthEnd = endOfDay(endOfMonth(monthStart))
  return monthEnd >= period.start && monthStart <= period.end
}

function clientsForPeriod(
  period: ResolvedReportsPeriod,
  clientsByMonth: Map<string, ClientStatementSummary[]>
): ClientStatementSummary[] {
  return enumerateCalendarMonthsInPeriod(period).flatMap(
    ({ month, year }) => clientsByMonth.get(portfolioMonthKey(month, year)) ?? []
  )
}

function summariesForPeriod(
  period: ResolvedReportsPeriod,
  byMonth: Map<string, PortfolioPeriodSummary>
): PortfolioPeriodSummary[] {
  return enumerateCalendarMonthsInPeriod(period)
    .map(({ month, year }) => byMonth.get(portfolioMonthKey(month, year)))
    .filter((s): s is PortfolioPeriodSummary => s != null)
}

function occupancyRatePct(metrics: PortfolioPreviewMetrics): number {
  const available = metrics.totalProperties * metrics.daysInPeriod
  if (available <= 0) return 0
  return round2((metrics.bookedNights / available) * 100)
}

function metricsToComparison(m: PortfolioPreviewMetrics) {
  return {
    totalRevenueManaged: m.grossRevenue,
    totalManagementFees: m.managementFees,
    totalOwnerPayouts: m.ownerPayouts,
    totalBookings: m.bookingCount,
  }
}

function hasComparisonData(m: PortfolioPreviewMetrics): boolean {
  return (
    m.grossRevenue > 0 ||
    m.managementFees > 0 ||
    m.ownerPayouts > 0 ||
    m.bookingCount > 0
  )
}

export function computeReportsSummary(input: {
  period: ResolvedReportsPeriod
  portfolio: ReportsPortfolioInput
  expenses: ReportsExpenseRow[]
  properties: ReportsPropertyRow[]
  activeClients: number
}): ReportsSummaryResponse {
  const { period, portfolio, expenses, properties, activeClients } = input
  const { byMonth, clientsByMonth } = portfolio

  const current = resolvePortfolioMetricsForPeriod(period, byMonth)
  const prevPeriod = previousCalendarPeriod(period)
  const yoyPeriod = yearOverYearPeriod(period)
  const previous = resolvePortfolioMetricsForPeriod(prevPeriod, byMonth)
  const yearAgo = resolvePortfolioMetricsForPeriod(yoyPeriod, byMonth)

  const periodClients = clientsForPeriod(period, clientsByMonth)
  const feeTotals = feeTotalsFromStatementClients(periodClients)
  const platformByPlatform = platformBreakdownFromStatementClients(periodClients)

  const expensesInPeriod = expenses.filter((e) => expenseInPeriod(e, period))
  const totalExpenses = round2(expensesInPeriod.reduce((s, e) => s + num(e.total), 0))

  const expensesByProperty = new Map<string, number>()
  for (const e of expensesInPeriod) {
    expensesByProperty.set(
      e.property_id,
      round2((expensesByProperty.get(e.property_id) ?? 0) + num(e.total))
    )
  }

  const totalRevenueManaged = current.grossRevenue
  const totalManagementFees = current.managementFees
  const totalOwnerPayouts = current.ownerPayouts
  const totalBookings = current.bookingCount
  const totalProperties = properties.length
  const activeProperties = current.propertiesWithFigures

  const averageManagementFeeRate =
    totalRevenueManaged > 0
      ? round2((totalManagementFees / totalRevenueManaged) * 100)
      : 0

  const revenuePerProperty =
    activeProperties > 0 ? round2(totalRevenueManaged / activeProperties) : 0
  const feesPerProperty =
    activeProperties > 0 ? round2(totalManagementFees / activeProperties) : 0

  const averageBookingValue =
    totalBookings > 0 ? round2(totalRevenueManaged / totalBookings) : 0
  const averageNightlyRate =
    current.bookedNights > 0 ? round2(totalRevenueManaged / current.bookedNights) : 0

  const occupancyRate = occupancyRatePct(current)

  const topPlatformEntry = topN(
    [...platformByPlatform.entries()],
    1,
    ([, data]) => data.revenue
  )[0]
  const topPlatform = topPlatformEntry?.[0] ?? "—"

  const trendMonths = trendMonthsEndingAt(period.end, 12)

  const monthlyTrend = trendMonths.map(({ month, year, label }) => {
    const key = portfolioMonthKey(month, year)
    const summary = byMonth.get(key)
    const metrics = summary ? previewMetricsFromPortfolio(summary) : combinePreviewMetrics([])
    const monthOccupancy = occupancyRatePct(metrics)
    return {
      month,
      year,
      label,
      revenueManaged: metrics.grossRevenue,
      managementFees: metrics.managementFees,
      ownerPayouts: metrics.ownerPayouts,
      bookingCount: metrics.bookingCount,
      occupancyRate: monthOccupancy,
    }
  })

  const platformBreakdown = [...platformByPlatform.entries()]
    .map(([platform, data]) => ({
      platform,
      propertyCount: data.propertyIds.size,
      bookings: data.bookingIds.size,
      nights: data.nights,
      revenue: round2(data.revenue),
      managementFees: round2(data.managementFees),
      channelFees: round2(data.channelFees),
      ownerPayouts: round2(data.ownerPayouts),
      revenueShare:
        totalRevenueManaged > 0 ? round2((data.revenue / totalRevenueManaged) * 100) : 0,
      averageCommissionPct:
        data.revenue > 0 ? round2((data.channelFees / data.revenue) * 100) : 0,
      averageBookingValue:
        data.bookingIds.size > 0 ? round2(data.revenue / data.bookingIds.size) : 0,
      averageNightlyRate: data.nights > 0 ? round2(data.revenue / data.nights) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const platformMonthlyTrend = trendMonths.map(({ month, year, label }) => {
    const key = portfolioMonthKey(month, year)
    const clients = clientsByMonth.get(key) ?? []
    const slice = platformBreakdownFromStatementClients(clients)
    const platforms = [...slice.entries()]
      .map(([platform, data]) => ({
        platform,
        bookings: data.bookingIds.size,
        nights: data.nights,
        revenue: round2(data.revenue),
        channelFees: round2(data.channelFees),
      }))
      .sort((a, b) => b.revenue - a.revenue)
    return { month, year, label, platforms }
  })

  const propertyById = new Map(properties.map((p) => [p.id, p]))
  const periodSummaries = summariesForPeriod(period, byMonth)

  type PropertyAgg = {
    bookings: number
    nights: number
    grossRevenue: number
    managementFees: number
    ownerPayout: number
    byPlatform: Map<string, { bookings: number; nights: number; revenue: number; managementFees: number }>
  }

  const propertyAgg = new Map<string, PropertyAgg>()

  for (const summary of periodSummaries) {
    for (const row of summary.propertyRows) {
      if (
        row.previewBookedNights == null &&
        row.previewGrossRevenue == null &&
        row.previewOwnerPayout == null
      ) {
        continue
      }
      let agg = propertyAgg.get(row.propertyId)
      if (!agg) {
        agg = {
          bookings: 0,
          nights: 0,
          grossRevenue: 0,
          managementFees: 0,
          ownerPayout: 0,
          byPlatform: new Map(),
        }
        propertyAgg.set(row.propertyId, agg)
      }
      agg.bookings += row.previewBookingCount ?? 0
      agg.nights += row.previewBookedNights ?? 0
      agg.grossRevenue = round2(agg.grossRevenue + (row.previewGrossRevenue ?? 0))
      agg.managementFees = round2(agg.managementFees + (row.previewManagementFees ?? 0))
      agg.ownerPayout = round2(agg.ownerPayout + (row.previewOwnerPayout ?? 0))
    }
  }

  for (const client of periodClients) {
    for (const property of client.properties) {
      for (const line of property.lines) {
        let agg = propertyAgg.get(property.propertyId)
        if (!agg) {
          agg = {
            bookings: 0,
            nights: 0,
            grossRevenue: 0,
            managementFees: 0,
            ownerPayout: 0,
            byPlatform: new Map(),
          }
          propertyAgg.set(property.propertyId, agg)
        }
        let plat = agg.byPlatform.get(line.platform)
        if (!plat) {
          plat = { bookings: 0, nights: 0, revenue: 0, managementFees: 0 }
          agg.byPlatform.set(line.platform, plat)
        }
        plat.bookings += 1
        plat.nights += line.nights
        plat.revenue = round2(plat.revenue + line.grossRevenue)
        plat.managementFees = round2(plat.managementFees + line.managementFeeAmount)
      }
    }
  }

  const daysForOccupancy =
    period.kind === "month" && period.month
      ? portfolioDaysInMonth(period.month, period.year)
      : current.daysInPeriod

  const propertyBreakdown = [...propertyAgg.entries()]
    .map(([propertyId, data]) => {
      const meta = propertyById.get(propertyId)
      const topPlat = topN([...data.byPlatform.entries()], 1, ([, p]) => p.revenue)[0]
      const grossRevenue = round2(data.grossRevenue)
      const managementFees = round2(data.managementFees)
      return {
        propertyId,
        propertyName: meta?.name ?? "Unknown",
        unitNumber: meta?.unit_number ?? null,
        ownerName: meta?.client?.name ?? null,
        bookings: data.bookings,
        nights: data.nights,
        occupancyRate:
          daysForOccupancy > 0 ? round2((data.nights / daysForOccupancy) * 100) : 0,
        grossRevenue,
        managementFees,
        managementFeesOnly: managementFees,
        processingFees: 0,
        channelFees: 0,
        ownerPayout: round2(data.ownerPayout),
        additionalExpenses: expensesByProperty.get(propertyId) ?? 0,
        managementFeeRate:
          grossRevenue > 0 ? round2((managementFees / grossRevenue) * 100) : 0,
        averageNightlyRate: data.nights > 0 ? round2(grossRevenue / data.nights) : 0,
        topPlatform: topPlat?.[0] ?? null,
        revenueShare:
          totalRevenueManaged > 0
            ? round2((data.grossRevenue / totalRevenueManaged) * 100)
            : 0,
        platforms: [...data.byPlatform.entries()]
          .map(([platform, plat]) => ({
            platform,
            bookings: plat.bookings,
            nights: plat.nights,
            revenue: round2(plat.revenue),
            managementFees: round2(plat.managementFees),
          }))
          .sort((a, b) => b.revenue - a.revenue),
      }
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue)

  const bookingsInPeriod = (() => {
    const rows: ReportsSummaryResponse["bookingsInPeriod"] = []
    for (const client of periodClients) {
      for (const property of client.properties) {
        const meta = propertyById.get(property.propertyId)
        for (const line of property.lines) {
          rows.push({
            bookingId: line.bookingId,
            propertyId: property.propertyId,
            propertyName: meta?.name ?? property.propertyName,
            guestName: line.guestName,
            platform: line.platform,
            checkIn: line.checkIn,
            checkOut: line.checkOut,
            nights: line.nights,
            grossRevenue: line.grossRevenue,
            managementFees: line.managementFeeAmount,
            channelFees: round2(line.platformFee + line.paymentProcessingFee),
            ownerPayout: line.netToOwner,
          })
        }
      }
    }
    return rows.sort((a, b) => b.grossRevenue - a.grossRevenue)
  })()

  const topProperties = {
    byRevenue: topN(propertyBreakdown, 5, (p) => p.grossRevenue).map((p) => ({
      propertyId: p.propertyId,
      name: p.propertyName,
      value: p.grossRevenue,
    })),
    byOccupancy: topN(propertyBreakdown, 5, (p) => p.occupancyRate).map((p) => ({
      propertyId: p.propertyId,
      name: p.propertyName,
      value: p.occupancyRate,
    })),
    byManagementFees: topN(propertyBreakdown, 5, (p) => p.managementFees).map((p) => ({
      propertyId: p.propertyId,
      name: p.propertyName,
      value: p.managementFees,
    })),
  }

  const hasPrev = hasComparisonData(previous)
  const hasYoy = hasComparisonData(yearAgo)

  const periodComparison = hasPrev
    ? {
        previous: metricsToComparison(previous),
        revenueGrowthPct: growthPct(totalRevenueManaged, previous.grossRevenue),
        managementFeesGrowthPct: growthPct(totalManagementFees, previous.managementFees),
        ownerPayoutsGrowthPct: growthPct(totalOwnerPayouts, previous.ownerPayouts),
        bookingsGrowthPct: growthPct(totalBookings, previous.bookingCount),
      }
    : null

  const yoyComparison = hasYoy
    ? {
        currentPeriodFees: totalManagementFees,
        previousPeriodFees: yearAgo.managementFees,
        feeGrowthPct: growthPct(totalManagementFees, yearAgo.managementFees),
        currentRevenue: totalRevenueManaged,
        previousRevenue: yearAgo.grossRevenue,
        revenueGrowthPct: growthPct(totalRevenueManaged, yearAgo.grossRevenue),
      }
    : null

  const feeBreakdown = {
    managementFees: feeTotals.managementFees,
    processingFees: feeTotals.processingFees,
    channelFees: feeTotals.channelFees,
    totalEarned: round2(
      feeTotals.managementFees + feeTotals.processingFees + feeTotals.channelFees
    ),
  }

  return {
    period: {
      label: period.label,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      daysInPeriod: period.daysInPeriod,
    },
    business: {
      totalRevenueManaged,
      totalManagementFees,
      totalChannelFees: feeTotals.channelFees,
      totalOwnerPayouts,
      totalExpenses,
      averageManagementFeeRate,
      revenuePerProperty,
      feesPerProperty,
    },
    feeBreakdown,
    periodComparison,
    portfolio: {
      totalProperties,
      activeProperties,
      totalActiveClients: activeClients,
      totalBookings,
      totalNights: current.bookedNights,
      averageBookingValue,
      averageNightlyRate,
      occupancyRate,
      topPlatform,
    },
    monthlyTrend,
    platformBreakdown,
    platformMonthlyTrend,
    propertyBreakdown,
    bookingsInPeriod,
    topProperties,
    yoyComparison,
    generatedAt: new Date().toISOString(),
  }
}
