import { BookingSource } from "@prisma/client"
import Link from "next/link"
import type { BookingAnalyticsData } from "@/lib/booking-analytics"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const sourceLabel: Record<BookingSource, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  DIRECT: "Direct",
  OTHER: "Other",
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n)
}

type BookingAnalyticsDisplayProps = {
  data: BookingAnalyticsData
  csvOnly: boolean
}

export function BookingAnalyticsDisplay({ data, csvOnly }: BookingAnalyticsDisplayProps) {
  const { totals, byProperty, bySource, byMonth } = data
  const maxMonthGross = Math.max(...byMonth.map((m) => m.sumGross), 1)
  const maxSourceCount = Math.max(...bySource.map((s) => s.count), 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-slate-600">
          Stays overlapping the selected dates (check-in / check-out range).{" "}
          {csvOnly ? (
            <span className="font-medium text-green-800">Showing rows tied to CSV imports.</span>
          ) : null}
        </p>
        <Link
          href="/bookings/import"
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          Booking CSV import
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-600">Bookings in range</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totals.bookingCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-600">Guest nights</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totals.totalNights}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-600">Gross revenue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(totals.sumGross)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-600">Net revenue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(totals.sumNet)}</p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">By month (check-in)</h4>
          <p className="mt-0.5 text-xs text-slate-500">Gross revenue and booking count</p>
          {byMonth.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No bookings in this range.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byMonth.map((m) => (
                <li key={m.monthKey} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-slate-600">{m.label}</span>
                  <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <div
                      className="h-full min-w-0 rounded-md bg-green-700 transition-[width]"
                      style={{ width: `${(m.sumGross / maxMonthGross) * 100}%` }}
                      title={formatMoney(m.sumGross)}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-700">
                    {m.count} · {formatMoney(m.sumGross)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">By channel</h4>
          <p className="mt-0.5 text-xs text-slate-500">Share of bookings in range</p>
          {bySource.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No bookings in this range.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {bySource.map((s) => (
                <li key={s.source} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-600">
                    {sourceLabel[s.source]}
                  </span>
                  <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <div
                      className="h-full rounded-md bg-emerald-600/90"
                      style={{ width: `${(s.count / maxSourceCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-700">
                    {s.count} · {formatMoney(s.sumGross)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">By property</h4>
        <p className="mt-0.5 text-xs text-slate-500">Sorted by gross revenue</p>
        {byProperty.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No bookings in this range.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byProperty.map((row) => (
                  <TableRow key={row.propertyId}>
                    <TableCell className="font-medium text-slate-900">
                      <Link
                        href={`/dashboard/properties/${row.propertyId}?tab=bookings`}
                        className="text-green-700 hover:text-green-800 hover:underline"
                      >
                        {row.propertyName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.sumGross)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.sumNet)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
