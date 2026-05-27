"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { ClientsMonthToolbar } from "@/components/clients/clients-month-toolbar"
import { ReportsBusinessKpis } from "@/components/reports/reports-business-kpis"
import { ReportsPropertyTable } from "@/components/reports/reports-property-table"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"
import { useReportsSummary } from "@/components/reports/use-reports-summary"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ReportsSummaryResponse } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

type BookingSortKey =
  | "propertyName"
  | "guestName"
  | "platform"
  | "checkIn"
  | "nights"
  | "grossRevenue"

function MonthComparisonCard({ data }: { data: ReportsSummaryResponse }) {
  const cmp = data.periodComparison
  if (!cmp) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No prior-period data for comparison.
      </p>
    )
  }

  const rows = [
    {
      label: "Revenue managed",
      current: data.business.totalRevenueManaged,
      previous: cmp.previous.totalRevenueManaged,
      growth: cmp.revenueGrowthPct,
    },
    {
      label: "Management fees",
      current: data.business.totalManagementFees,
      previous: cmp.previous.totalManagementFees,
      growth: cmp.managementFeesGrowthPct,
    },
    {
      label: "Owner payouts",
      current: data.business.totalOwnerPayouts,
      previous: cmp.previous.totalOwnerPayouts,
      growth: cmp.ownerPayoutsGrowthPct,
    },
    {
      label: "Bookings",
      current: data.portfolio.totalBookings,
      previous: cmp.previous.totalBookings,
      growth: cmp.bookingsGrowthPct,
    },
  ]

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">vs previous month</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => {
          const Icon =
            row.growth > 0 ? ArrowUp : row.growth < 0 ? ArrowDown : Minus
          const tone =
            row.growth > 0
              ? "text-emerald-700"
              : row.growth < 0
                ? "text-red-600"
                : "text-slate-500"
          return (
            <div key={row.label} className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-medium text-slate-500">{row.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {row.label === "Bookings"
                  ? row.current
                  : formatMoneyZar(row.current)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Prev:{" "}
                {row.label === "Bookings"
                  ? row.previous
                  : formatMoneyZar(row.previous)}
              </p>
              <p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", tone)}>
                <Icon className="size-3.5" />
                {row.growth > 0 ? "+" : ""}
                {row.growth.toFixed(1)}%
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MonthlyBookingsTable({ data }: { data: ReportsSummaryResponse }) {
  const [sortKey, setSortKey] = useState<BookingSortKey>("grossRevenue")
  const [sortAsc, setSortAsc] = useState(false)

  const rows = useMemo(() => {
    const sorted = [...data.bookingsInPeriod].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "propertyName":
          cmp = a.propertyName.localeCompare(b.propertyName)
          break
        case "guestName":
          cmp = a.guestName.localeCompare(b.guestName)
          break
        case "platform":
          cmp = a.platform.localeCompare(b.platform)
          break
        case "checkIn":
          cmp = a.checkIn.localeCompare(b.checkIn)
          break
        case "nights":
          cmp = a.nights - b.nights
          break
        case "grossRevenue":
          cmp = a.grossRevenue - b.grossRevenue
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return sorted
  }, [data.bookingsInPeriod, sortKey, sortAsc])

  const toggleSort = (key: BookingSortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(key === "propertyName" || key === "guestName" || key === "platform")
    }
  }

  const indicator = (key: BookingSortKey) =>
    sortKey === key ? <span className="ml-1 text-slate-400">{sortAsc ? "↑" : "↓"}</span> : null

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-900">Bookings</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          All properties · {rows.length} bookings in {data.period.label}
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="cursor-pointer text-slate-600"
                onClick={() => toggleSort("propertyName")}
              >
                Property{indicator("propertyName")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-slate-600"
                onClick={() => toggleSort("guestName")}
              >
                Guest{indicator("guestName")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-slate-600"
                onClick={() => toggleSort("platform")}
              >
                Platform{indicator("platform")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-slate-600"
                onClick={() => toggleSort("checkIn")}
              >
                Check-in{indicator("checkIn")}
              </TableHead>
              <TableHead className="text-slate-600">Check-out</TableHead>
              <TableHead
                className="cursor-pointer text-right text-slate-600"
                onClick={() => toggleSort("nights")}
              >
                Nights{indicator("nights")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-slate-600"
                onClick={() => toggleSort("grossRevenue")}
              >
                Gross revenue{indicator("grossRevenue")}
              </TableHead>
              <TableHead className="text-right text-slate-600">Mgmt fees</TableHead>
              <TableHead className="text-right text-slate-600">Owner payout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="py-10 text-center text-slate-500">
                  No bookings in this month.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.bookingId}>
                  <TableCell className="font-medium text-slate-900">{row.propertyName}</TableCell>
                  <TableCell className="text-slate-700">{row.guestName}</TableCell>
                  <TableCell className="text-slate-600">{row.platform}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {row.checkIn
                      ? format(new Date(row.checkIn), "d MMM yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {row.checkOut
                      ? format(new Date(row.checkOut), "d MMM yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.nights}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.grossRevenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">
                    {formatMoneyZar(row.managementFees)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.ownerPayout)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

export function ReportsMonthlyView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const now = useMemo(() => new Date(), [])

  const month = Number(searchParams.get("month") ?? now.getMonth() + 1)
  const year = Number(searchParams.get("year") ?? now.getFullYear())

  const { data, error, showSkeleton, contentBusy, fetchSummary } = useReportsSummary({
    periodKind: "month",
    month,
    year,
  })

  const updateMonth = useCallback(
    (patch: { month?: number; year?: number }) => {
      const next = new URLSearchParams(searchParams.toString())
      next.set("month", String(patch.month ?? month))
      next.set("year", String(patch.year ?? year))
      const q = next.toString()
      router.push(q ? `/reports/monthly?${q}` : "/reports/monthly")
    },
    [router, searchParams, month, year]
  )

  return (
    <div className="space-y-6">
      <ClientsMonthToolbar
        month={month}
        year={year}
        onMonthChange={(m) => updateMonth({ month: m })}
        onYearChange={(y) => updateMonth({ year: y })}
        compact
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
          <ReportsBusinessKpis data={data} />
          <MonthComparisonCard data={data} />
          <ReportsPropertyTable data={data} />
          <MonthlyBookingsTable data={data} />
        </div>
      ) : null}
    </div>
  )
}
