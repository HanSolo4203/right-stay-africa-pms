"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, subMonths } from "date-fns"
import { ReportsPeriodBar } from "@/components/reports/reports-period-bar"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"
import { useReportsSummary } from "@/components/reports/use-reports-summary"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPlatformColor } from "@/lib/calendar/platform-colors"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ReportsPeriodKind } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

export function ReportsPlatformsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const now = useMemo(() => new Date(), [])

  const periodKind = (searchParams.get("period") ?? "month") as ReportsPeriodKind
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1)
  const year = Number(searchParams.get("year") ?? now.getFullYear())
  const from = searchParams.get("from") ?? format(subMonths(now, 4), "yyyy-MM-dd")
  const to = searchParams.get("to") ?? format(now, "yyyy-MM-dd")

  const { data, error, showSkeleton, contentBusy, fetchSummary } = useReportsSummary({
    periodKind,
    month,
    year,
    from,
    to,
  })

  const pushParams = (next: URLSearchParams) => {
    const q = next.toString()
    router.push(q ? `/reports/platforms?${q}` : "/reports/platforms")
  }

  const updateSearch = (patch: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString())
    patch(next)
    pushParams(next)
  }

  const platformNames = useMemo(() => {
    if (!data) return []
    const names = new Set<string>()
    for (const row of data.platformBreakdown) names.add(row.platform)
    for (const month of data.platformMonthlyTrend) {
      for (const p of month.platforms) names.add(p.platform)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [data])

  const monthlyMatrix = useMemo(() => {
    if (!data) return []
    return platformNames.map((platform) => {
      const cells = data.platformMonthlyTrend.map((month) => {
        const match = month.platforms.find((p) => p.platform === platform)
        return {
          monthLabel: month.label,
          revenue: match?.revenue ?? 0,
          bookings: match?.bookings ?? 0,
        }
      })
      const totalRevenue = cells.reduce((s, c) => s + c.revenue, 0)
      return { platform, cells, totalRevenue }
    })
  }, [data, platformNames])

  const periodTotals = useMemo(() => {
    if (!data) return null
    return data.platformBreakdown.reduce(
      (acc, row) => ({
        propertyCount: acc.propertyCount + row.propertyCount,
        bookings: acc.bookings + row.bookings,
        nights: acc.nights + row.nights,
        revenue: acc.revenue + row.revenue,
        channelFees: acc.channelFees + row.channelFees,
      }),
      { propertyCount: 0, bookings: 0, nights: 0, revenue: 0, channelFees: 0 }
    )
  }, [data])

  return (
    <div className="space-y-6">
      <ReportsPeriodBar
        periodKind={periodKind}
        month={month}
        year={year}
        from={from}
        to={to}
        onPeriodKindChange={(kind) => {
          updateSearch((next) => {
            next.set("period", kind)
            if (kind === "month") {
              next.set("month", String(month))
              next.set("year", String(year))
              next.delete("from")
              next.delete("to")
            } else if (kind === "year") {
              next.set("year", String(year))
              next.delete("month")
              next.delete("from")
              next.delete("to")
            } else {
              next.set("from", from)
              next.set("to", to)
              next.delete("month")
            }
          })
        }}
        onMonthChange={(m) => {
          updateSearch((next) => {
            next.set("period", "month")
            next.set("month", String(m))
            next.set("year", String(year))
          })
        }}
        onYearChange={(y) => {
          updateSearch((next) => {
            next.set("period", periodKind === "year" ? "year" : "month")
            next.set("year", String(y))
            if (periodKind === "month") next.set("month", String(month))
          })
        }}
        onFromChange={(value) => {
          updateSearch((next) => {
            next.set("period", "custom")
            next.set("from", value)
            next.set("to", to)
            next.delete("month")
          })
        }}
        onToChange={(value) => {
          updateSearch((next) => {
            next.set("period", "custom")
            next.set("from", from)
            next.set("to", value)
            next.delete("month")
          })
        }}
      />

      {error && !data ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void fetchSummary({ hadData: false })}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {showSkeleton ? (
        <ReportsContentSkeleton />
      ) : data ? (
        <div
          className={cn(
            "space-y-6 transition-opacity",
            contentBusy && "pointer-events-none opacity-60"
          )}
        >
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Platform performance</h3>
              <p className="mt-0.5 text-sm text-slate-500">{data.period.label}</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-slate-600">Platform</TableHead>
                    <TableHead className="text-right text-slate-600">Properties</TableHead>
                    <TableHead className="text-right text-slate-600">Bookings</TableHead>
                    <TableHead className="text-right text-slate-600">Nights</TableHead>
                    <TableHead className="text-right text-slate-600">Gross revenue</TableHead>
                    <TableHead className="text-right text-slate-600">Channel commission</TableHead>
                    <TableHead className="text-right text-slate-600">Avg commission %</TableHead>
                    <TableHead className="text-right text-slate-600">Avg nightly</TableHead>
                    <TableHead className="text-right text-slate-600">Avg booking value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.platformBreakdown.map((row) => {
                    const color = getPlatformColor(row.platform)
                    return (
                      <TableRow key={row.platform}>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color.bg }}
                            />
                            {row.platform}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.propertyCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.bookings}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.nights}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyZar(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyZar(row.channelFees)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.averageCommissionPct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyZar(row.averageNightlyRate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyZar(row.averageBookingValue)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                {periodTotals ? (
                  <TableFooter>
                    <TableRow className="bg-slate-50 font-semibold hover:bg-slate-50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {periodTotals.propertyCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {periodTotals.bookings}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{periodTotals.nights}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(periodTotals.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(periodTotals.channelFees)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Monthly revenue by platform
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">Last 12 months · gross revenue</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 z-10 bg-white text-slate-600">
                      Platform
                    </TableHead>
                    {data.platformMonthlyTrend.map((m) => (
                      <TableHead key={`${m.year}-${m.month}`} className="text-right text-slate-600">
                        {m.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-semibold text-slate-700">12-mo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyMatrix.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={data.platformMonthlyTrend.length + 2}
                        className="py-10 text-center text-slate-500"
                      >
                        No platform data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthlyMatrix.map((row) => {
                      const color = getPlatformColor(row.platform)
                      return (
                        <TableRow key={row.platform}>
                          <TableCell className="sticky left-0 z-10 bg-white">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color.bg }}
                              />
                              {row.platform}
                            </span>
                          </TableCell>
                          {row.cells.map((cell, i) => (
                            <TableCell
                              key={`${row.platform}-${i}`}
                              className="text-right text-xs tabular-nums text-slate-700"
                            >
                              {cell.revenue > 0 ? formatMoneyZar(cell.revenue) : "—"}
                            </TableCell>
                          ))}
                          <TableCell className="text-right text-sm font-semibold tabular-nums text-slate-900">
                            {formatMoneyZar(row.totalRevenue)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
