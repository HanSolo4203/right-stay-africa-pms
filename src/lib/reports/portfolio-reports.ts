import { addMonths, format, startOfMonth, subMonths } from "date-fns"
import type { PortfolioPeriodSummary } from "@/lib/clients/portfolio-period-summary"
import type { ClientStatementSummary } from "@/types/statement"
import type { ResolvedReportsPeriod } from "@/lib/reports/parse-reports-period"

export function portfolioMonthKey(month: number, year: number): string {
  return `${year}-${month}`
}

export function enumerateCalendarMonthsInPeriod(
  period: ResolvedReportsPeriod
): Array<{ month: number; year: number }> {
  const keys: Array<{ month: number; year: number }> = []
  let cursor = startOfMonth(period.start)
  const end = startOfMonth(period.end)
  while (cursor <= end) {
    keys.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 })
    cursor = addMonths(cursor, 1)
  }
  return keys
}

export type PortfolioPreviewMetrics = {
  grossRevenue: number
  managementFees: number
  ownerPayouts: number
  bookingCount: number
  additionalExpenses: number
  bookedNights: number
  propertiesWithFigures: number
  totalProperties: number
  daysInPeriod: number
  rightStayIncomeTotal: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function previewMetricsFromPortfolio(
  summary: PortfolioPeriodSummary
): PortfolioPreviewMetrics {
  const preview = summary.preview
  const occupancy = summary.analytics.preview.occupancy
  return {
    grossRevenue: preview.grossRevenue,
    managementFees: preview.managementFees,
    ownerPayouts: preview.ownerPayouts,
    bookingCount: preview.bookingCount,
    additionalExpenses: preview.additionalExpenses,
    bookedNights: occupancy.bookedNights,
    propertiesWithFigures: preview.propertiesWithFigures,
    totalProperties: summary.totalProperties,
    daysInPeriod: occupancy.daysInMonth,
    rightStayIncomeTotal: preview.rightStayIncome.total,
  }
}

/** Sum preview tracks across multiple calendar months (year / custom ranges). */
export function combinePreviewMetrics(
  summaries: PortfolioPeriodSummary[]
): PortfolioPreviewMetrics {
  if (summaries.length === 0) {
    return {
      grossRevenue: 0,
      managementFees: 0,
      ownerPayouts: 0,
      bookingCount: 0,
      additionalExpenses: 0,
      bookedNights: 0,
      propertiesWithFigures: 0,
      totalProperties: 0,
      daysInPeriod: 0,
      rightStayIncomeTotal: 0,
    }
  }

  let grossRevenue = 0
  let managementFees = 0
  let ownerPayouts = 0
  let bookingCount = 0
  let additionalExpenses = 0
  let bookedNights = 0
  let rightStayIncomeTotal = 0
  let daysInPeriod = 0
  let propertiesWithFigures = 0
  const totalProperties = Math.max(...summaries.map((s) => s.totalProperties))

  for (const summary of summaries) {
    const m = previewMetricsFromPortfolio(summary)
    grossRevenue = round2(grossRevenue + m.grossRevenue)
    managementFees = round2(managementFees + m.managementFees)
    ownerPayouts = round2(ownerPayouts + m.ownerPayouts)
    bookingCount += m.bookingCount
    additionalExpenses = round2(additionalExpenses + m.additionalExpenses)
    bookedNights += m.bookedNights
    rightStayIncomeTotal = round2(rightStayIncomeTotal + m.rightStayIncomeTotal)
    daysInPeriod += m.daysInPeriod
    propertiesWithFigures = Math.max(propertiesWithFigures, m.propertiesWithFigures)
  }

  return {
    grossRevenue,
    managementFees,
    ownerPayouts,
    bookingCount,
    additionalExpenses,
    bookedNights,
    propertiesWithFigures,
    totalProperties,
    daysInPeriod,
    rightStayIncomeTotal,
  }
}

export function resolvePortfolioMetricsForPeriod(
  period: ResolvedReportsPeriod,
  byMonth: Map<string, PortfolioPeriodSummary>
): PortfolioPreviewMetrics {
  const months = enumerateCalendarMonthsInPeriod(period)
  const summaries = months
    .map(({ month, year }) => byMonth.get(portfolioMonthKey(month, year)))
    .filter((s): s is PortfolioPeriodSummary => s != null)
  return combinePreviewMetrics(summaries)
}

export type StatementLineFeeTotals = {
  managementFees: number
  processingFees: number
  channelFees: number
}

export function feeTotalsFromStatementClients(
  clients: ClientStatementSummary[]
): StatementLineFeeTotals {
  let managementFees = 0
  let processingFees = 0
  let channelFees = 0

  for (const client of clients) {
    for (const property of client.properties) {
      const t = property.totals
      managementFees = round2(managementFees + t.totalManagementFees)
      processingFees = round2(processingFees + t.totalPaymentProcessingFees)
      channelFees = round2(channelFees + t.totalPlatformFees)
    }
  }

  return { managementFees, processingFees, channelFees }
}

export type StatementPlatformAccum = {
  propertyIds: Set<string>
  bookingIds: Set<string>
  nights: number
  revenue: number
  managementFees: number
  channelFees: number
  ownerPayouts: number
}

export function platformBreakdownFromStatementClients(
  clients: ClientStatementSummary[]
): Map<string, StatementPlatformAccum> {
  const byPlatform = new Map<string, StatementPlatformAccum>()

  for (const client of clients) {
    for (const property of client.properties) {
      for (const line of property.lines) {
        let plat = byPlatform.get(line.platform)
        if (!plat) {
          plat = {
            propertyIds: new Set(),
            bookingIds: new Set(),
            nights: 0,
            revenue: 0,
            managementFees: 0,
            channelFees: 0,
            ownerPayouts: 0,
          }
          byPlatform.set(line.platform, plat)
        }
        plat.propertyIds.add(property.propertyId)
        plat.bookingIds.add(line.bookingId)
        plat.nights += line.nights
        plat.revenue = round2(plat.revenue + line.grossRevenue)
        plat.managementFees = round2(plat.managementFees + line.managementFeeAmount)
        plat.channelFees = round2(plat.channelFees + line.platformFee + line.paymentProcessingFee)
        plat.ownerPayouts = round2(plat.ownerPayouts + line.netToOwner)
      }
    }
  }

  return byPlatform
}

export function trendMonthsEndingAt(periodEnd: Date, count = 12) {
  const trendEnd = startOfMonth(periodEnd)
  return Array.from({ length: count }, (_, i) => {
    const d = addMonths(subMonths(trendEnd, count - 1), i)
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: format(d, "MMM"),
    }
  })
}
