import "server-only"

import { ClientStatus } from "@prisma/client"
import { aggregatePortfolioFromClients } from "@/lib/clients/portfolio-period-summary"
import { loadClientsWithStatements } from "@/lib/clients/statement-service"
import { computeReportsSummary } from "@/lib/reports/compute-reports-summary"
import {
  enumerateCalendarMonthsInPeriod,
  portfolioMonthKey,
  trendMonthsEndingAt,
} from "@/lib/reports/portfolio-reports"
import {
  parseReportsPeriodFromSearchParams,
  previousCalendarPeriod,
  yearOverYearPeriod,
  type ResolvedReportsPeriod,
} from "@/lib/reports/parse-reports-period"
import type { ReportsSummaryResponse } from "@/lib/reports/types"
import { prisma } from "@/lib/prisma"
import type { ClientStatementSummary } from "@/types/statement"
import type { PortfolioPeriodSummary } from "@/lib/clients/portfolio-period-summary"

function uniqueMonthKeys(
  keys: Array<{ month: number; year: number }>
): Array<{ month: number; year: number }> {
  const seen = new Set<string>()
  const out: Array<{ month: number; year: number }> = []
  for (const k of keys) {
    const id = portfolioMonthKey(k.month, k.year)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(k)
  }
  return out
}

function monthsNeededForReports(period: ResolvedReportsPeriod): Array<{ month: number; year: number }> {
  const trend = trendMonthsEndingAt(period.end, 12)
  return uniqueMonthKeys([
    ...enumerateCalendarMonthsInPeriod(period),
    ...enumerateCalendarMonthsInPeriod(previousCalendarPeriod(period)),
    ...enumerateCalendarMonthsInPeriod(yearOverYearPeriod(period)),
    ...trend.map(({ month, year }) => ({ month, year })),
  ])
}

function expenseWhereForPeriod(period: ResolvedReportsPeriod) {
  const months = enumerateCalendarMonthsInPeriod(period)
  if (period.kind === "year") {
    return { year: period.year }
  }
  if (period.kind === "month" && period.month) {
    return { year: period.year, month: period.month }
  }
  return { OR: months.map(({ month, year }) => ({ month, year })) }
}

export async function fetchReportsSummary(
  searchParams: URLSearchParams,
  today: Date = new Date()
): Promise<ReportsSummaryResponse | { error: string; status: number }> {
  const parsed = parseReportsPeriodFromSearchParams(searchParams, today)
  if ("error" in parsed) {
    return { error: parsed.error, status: 400 }
  }

  const monthKeys = monthsNeededForReports(parsed)

  const portfolioEntries: Array<{
    key: string
    summary: ReturnType<typeof aggregatePortfolioFromClients>
    clients: ClientStatementSummary[]
  }> = []
  for (const { month, year } of monthKeys) {
    const clients = await loadClientsWithStatements(month, year, { omitBookings: true })
    portfolioEntries.push({
      key: portfolioMonthKey(month, year),
      summary: aggregatePortfolioFromClients(clients, month, year),
      clients,
    })
  }

  const [properties, activeClients, expenses] = await Promise.all([
    prisma.property.findMany({
      select: {
        id: true,
        name: true,
        unit_number: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.client.count({ where: { status: ClientStatus.ACTIVE } }),
    prisma.statementExpense.findMany({
      where: expenseWhereForPeriod(parsed),
      select: {
        property_id: true,
        client_id: true,
        total: true,
        month: true,
        year: true,
      },
    }),
  ])

  const byMonth = new Map<string, PortfolioPeriodSummary>()
  const clientsByMonth = new Map<string, ClientStatementSummary[]>()
  for (const entry of portfolioEntries) {
    byMonth.set(entry.key, entry.summary)
    clientsByMonth.set(entry.key, entry.clients)
  }

  return computeReportsSummary({
    period: parsed,
    portfolio: { byMonth, clientsByMonth },
    expenses,
    properties,
    activeClients,
  })
}
