"use client"

import { BookingStatus } from "@prisma/client"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import Link from "next/link"
import { useMemo, useState } from "react"
import { formatChannelLabel } from "@/components/bookings/booking-list"
import { PropertyAnalyticsVisuals } from "@/components/properties/property-analytics-visuals"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { PortfolioDashboardBookingRow } from "@/lib/portfolio-month-analytics"
import {
  buildChannelGrossBreakdown,
  buildMonthlyPerformanceSeries,
  buildPerBookingGrossBars,
  shouldUseMonthlyTrendChart,
  type PropertyAnalyticsSnapshot,
} from "@/lib/property-booking-analytics"

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(n)
}

function formatMoneyFromString(s: string | null | undefined) {
  if (s == null || s === "") return "—"
  const n = Number(s)
  if (!Number.isFinite(n)) return "—"
  return formatMoney(n)
}

function formatShortDate(iso: string) {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return iso
  return format(d, "dd MMM yyyy")
}

function nightsBetween(checkIn: string, checkOut: string) {
  const a = parseISO(checkIn)
  const b = parseISO(checkOut)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—"
  return String(Math.max(0, differenceInCalendarDays(b, a)))
}

function csvImportedLabel(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return format(d, "dd MMM yyyy HH:mm")
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
}

type YearStatsMode = "this_year" | "last_year"

type DashboardPortfolioAnalyticsCardProps = {
  monthBookings: PortfolioDashboardBookingRow[]
  monthSnapshot: PropertyAnalyticsSnapshot
  yearThisBookings: PortfolioDashboardBookingRow[]
  yearLastBookings: PortfolioDashboardBookingRow[]
  yearThisSnapshot: PropertyAnalyticsSnapshot
  yearLastSnapshot: PropertyAnalyticsSnapshot
  yearThis: number
  yearLast: number
}

export function DashboardPortfolioAnalyticsCard({
  monthBookings,
  monthSnapshot,
  yearThisBookings,
  yearLastBookings,
  yearThisSnapshot,
  yearLastSnapshot,
  yearThis,
  yearLast,
}: DashboardPortfolioAnalyticsCardProps) {
  const [yearStatsMode, setYearStatsMode] = useState<YearStatsMode>("this_year")

  const activeYearBookings = yearStatsMode === "this_year" ? yearThisBookings : yearLastBookings
  const activeYearSnapshot = yearStatsMode === "this_year" ? yearThisSnapshot : yearLastSnapshot

  const monthlySeries = useMemo(
    () => buildMonthlyPerformanceSeries(activeYearBookings),
    [activeYearBookings]
  )
  const channelSlices = useMemo(
    () => buildChannelGrossBreakdown(activeYearBookings),
    [activeYearBookings]
  )
  const perBookingBars = useMemo(
    () => buildPerBookingGrossBars(activeYearBookings),
    [activeYearBookings]
  )
  const useMonthlyTrend = useMemo(
    () => shouldUseMonthlyTrendChart(monthlySeries, activeYearBookings.length),
    [monthlySeries, activeYearBookings.length]
  )

  const metrics = [
    { label: "Bookings made", value: String(activeYearSnapshot.bookingsMade), isMoney: false },
    { label: "Nights booked", value: String(activeYearSnapshot.nightsBooked), isMoney: false },
    { label: "Gross revenue", value: formatMoney(activeYearSnapshot.grossRevenue), isMoney: true },
    { label: "Total payout", value: formatMoney(activeYearSnapshot.totalPayout), isMoney: true },
    { label: "Commission paid", value: formatMoney(activeYearSnapshot.commission), isMoney: true },
    { label: "Management fees", value: formatMoney(activeYearSnapshot.managementFees), isMoney: true },
  ] as const

  return (
    <Card className="border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-emerald-50/40 shadow-sm ring-1 ring-slate-200/60">
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">Portfolio analytics</CardTitle>
          <CardDescription className="mt-1 text-slate-600">
            Booking table: {monthSnapshot.periodLabel}. KPIs and charts below use the calendar year you select
            (check-in date, all properties, excl. cancelled).
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-600">
            Income and totals for calendar year{" "}
            <span className="tabular-nums text-slate-900">{activeYearSnapshot.periodLabel}</span>
          </p>
          <div
            className="flex shrink-0 flex-wrap gap-1.5 rounded-lg border border-slate-200/80 bg-white/80 p-1 shadow-sm"
            role="group"
            aria-label="Year for portfolio totals"
          >
            <button
              type="button"
              aria-pressed={yearStatsMode === "this_year"}
              onClick={() => setYearStatsMode("this_year")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                yearStatsMode === "this_year"
                  ? "bg-green-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              This year ({yearThis})
            </button>
            <button
              type="button"
              aria-pressed={yearStatsMode === "last_year"}
              onClick={() => setYearStatsMode("last_year")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                yearStatsMode === "last_year"
                  ? "bg-green-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              Last year ({yearLast})
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
                {item.label}
              </dt>
              <dd
                className={cn(
                  "mt-1 truncate font-semibold text-slate-900 tabular-nums",
                  item.isMoney ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                )}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <PropertyAnalyticsVisuals
          snapshot={activeYearSnapshot}
          monthlySeries={monthlySeries}
          channelSlices={channelSlices}
          perBookingBars={perBookingBars}
          useMonthlyTrend={useMonthlyTrend}
        />

        <div className="space-y-3 border-t border-slate-200/80 pt-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Booking detail</h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Stays with check-in in {monthSnapshot.periodLabel}. Same fields as your booking CSV / Uplisting export.
            </p>
          </div>
          {monthBookings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-white/60 py-8 text-center text-sm text-slate-500">
              No bookings in this month.
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200/80 bg-white shadow-sm">
              <Table className="min-w-[1200px] table-fixed">
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="w-[200px] min-w-[180px] whitespace-normal text-xs font-semibold align-bottom">
                      Property
                    </TableHead>
                    <TableHead className="w-[160px] min-w-[140px] whitespace-normal text-xs font-semibold align-bottom">
                      Guest
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold">Check-in</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold">Check-out</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-right">Nights</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold">Channel</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold">Status</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold">Confirmation</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-right">Gross</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-right">Net</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-right">Payout</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-right">Commission</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-right">Mgmt fee</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-right">Cleaning</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold">CSV imported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthBookings.map((row) => (
                    <TableRow key={row.id} className="border-slate-100">
                      <TableCell className="whitespace-normal break-words align-top text-xs">
                        <Link
                          href={`/dashboard/properties/${row.property_id}?tab=overview`}
                          className="font-medium text-green-700 hover:text-green-800 hover:underline"
                        >
                          {row.property_name}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-normal break-words align-top text-xs font-medium text-slate-900">
                        {row.guest_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-700">
                        {formatShortDate(row.check_in)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-slate-700">
                        {formatShortDate(row.check_out)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-700">
                        {nightsBetween(row.check_in, row.check_out)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-700">
                        {formatChannelLabel(row.channel_name, row.source)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-700">
                        {STATUS_LABEL[row.status]}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate font-mono text-[0.65rem] text-slate-600">
                        {row.confirmation_code ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-800">
                        {formatMoneyFromString(row.gross_revenue)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-800">
                        {formatMoneyFromString(row.net_revenue)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-800">
                        {formatMoneyFromString(row.total_payout ?? row.total)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-800">
                        {formatMoneyFromString(row.commission)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-800">
                        {formatMoneyFromString(row.total_management_fee)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-800">
                        {formatMoneyFromString(row.cleaning_fee)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[0.65rem] tabular-nums text-slate-600">
                        {csvImportedLabel(row.csv_imported_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Revenue uses CSV import fields where available. Only stays whose check-in falls in the selected calendar
          month are included. Cancelled bookings are excluded.
        </p>
      </CardContent>
    </Card>
  )
}
