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
        <p className="text-sm spike-text-muted">
          Stays overlapping the selected dates (check-in / check-out range).{" "}
          {csvOnly ? (
            <span className="font-medium text-[var(--spike-primary)]">Showing rows tied to CSV imports.</span>
          ) : null}
        </p>
        <Link href="/bookings/import" className="spike-link text-sm font-semibold">
          Booking CSV import
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Bookings in range", totals.bookingCount],
            ["Guest nights", totals.totalNights],
            ["Gross revenue", formatMoney(totals.sumGross)],
            ["Net revenue", formatMoney(totals.sumNet)],
          ] as const
        ).map(([label, value]) => (
          <article key={label} className="spike-card p-4">
            <p className="text-xs font-medium spike-text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold spike-heading tabular-nums">{value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="spike-card p-5">
          <h4 className="text-sm font-semibold spike-heading">By month (check-in)</h4>
          <p className="mt-0.5 text-xs spike-text-muted">Gross revenue and booking count</p>
          {byMonth.length === 0 ? (
            <p className="mt-4 text-sm spike-text-muted">No bookings in this range.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byMonth.map((m) => (
                <li key={m.monthKey} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs spike-text-muted">{m.label}</span>
                  <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="spike-bar-fill h-full min-w-0 transition-[width]"
                      style={{ width: `${(m.sumGross / maxMonthGross) * 100}%` }}
                      title={formatMoney(m.sumGross)}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums spike-text-secondary">
                    {m.count} · {formatMoney(m.sumGross)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="spike-card p-5">
          <h4 className="text-sm font-semibold spike-heading">By channel</h4>
          <p className="mt-0.5 text-xs spike-text-muted">Share of bookings in range</p>
          {bySource.length === 0 ? (
            <p className="mt-4 text-sm spike-text-muted">No bookings in this range.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {bySource.map((s) => (
                <li key={s.source} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs spike-text-muted">{sourceLabel[s.source]}</span>
                  <div className="h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-[var(--spike-accent-cyan)] to-[var(--spike-primary)]"
                      style={{ width: `${(s.count / maxSourceCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums spike-text-secondary">
                    {s.count} · {formatMoney(s.sumGross)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="spike-card p-5">
        <h4 className="text-sm font-semibold spike-heading">By property</h4>
        <p className="mt-0.5 text-xs spike-text-muted">Sorted by gross revenue</p>
        {byProperty.length === 0 ? (
          <p className="mt-4 text-sm spike-text-muted">No bookings in this range.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--spike-glass-border)] hover:bg-transparent">
                  <TableHead className="spike-text-muted">Property</TableHead>
                  <TableHead className="text-right spike-text-muted">Bookings</TableHead>
                  <TableHead className="text-right spike-text-muted">Gross</TableHead>
                  <TableHead className="text-right spike-text-muted">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byProperty.map((row) => (
                  <TableRow key={row.propertyId} className="border-[var(--spike-glass-border)]">
                    <TableCell className="font-medium spike-heading">
                      <Link
                        href={`/dashboard/properties/${row.propertyId}?tab=bookings`}
                        className="spike-link hover:underline"
                      >
                        {row.propertyName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums spike-text-secondary">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums spike-text-secondary">
                      {formatMoney(row.sumGross)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums spike-text-secondary">
                      {formatMoney(row.sumNet)}
                    </TableCell>
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
