import Link from "next/link"
import { Suspense } from "react"
import { format } from "date-fns"
import { Building2, CalendarCheck, DollarSign, Users } from "lucide-react"
import { BookingStatus } from "@prisma/client"
import { BookingAnalyticsDisplay } from "@/components/dashboard/booking-analytics-display"
import { BookingAnalyticsFilters } from "@/components/dashboard/booking-analytics-filters"
import { DashboardActivityTimeline } from "@/components/dashboard/dashboard-activity-timeline"
import { DashboardPortfolioAnalyticsCard } from "@/components/dashboard/dashboard-portfolio-analytics-card"
import { DashboardPortfolioMonthFilters } from "@/components/dashboard/dashboard-portfolio-month-filters"
import { SpikeStatCard } from "@/components/dashboard/spike-stat-card"
import { prisma } from "@/lib/prisma"
import {
  getBookingAnalytics,
  parseBookingAnalyticsSearchParams,
  sanitizePropertyFilter,
} from "@/lib/booking-analytics"
import { fetchDashboardRecentActivity } from "@/lib/dashboard/recent-activity"
import {
  buildPortfolioMonthSnapshot,
  buildPortfolioYearSnapshot,
  calendarMonthFromOffset,
  fetchPortfolioBookingsForCalendarMonth,
  fetchPortfolioBookingsForCalendarYear,
  parsePortfolioMonthParam,
} from "@/lib/portfolio-month-analytics"

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n)
}

type DashboardHomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardHomePage({ searchParams }: DashboardHomePageProps) {
  const sp = (await searchParams) ?? {}
  const parsed = parseBookingAnalyticsSearchParams(sp)
  parsed.propertyId = await sanitizePropertyFilter(parsed.propertyId)

  const portfolioMonthOffset = parsePortfolioMonthParam(sp)
  const portfolioCalendar = calendarMonthFromOffset(portfolioMonthOffset)

  const [
    totalProperties,
    totalOwners,
    activeBookings,
    analytics,
    propertyOptions,
    portfolioBookings,
    portfolioYearThisBookings,
    portfolioYearLastBookings,
    recentActivity,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.owner.count(),
    prisma.booking.count({
      where: {
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
        },
      },
    }),
    getBookingAnalytics(parsed),
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    fetchPortfolioBookingsForCalendarMonth(portfolioCalendar.year, portfolioCalendar.monthIndex),
    fetchPortfolioBookingsForCalendarYear(portfolioCalendar.year),
    fetchPortfolioBookingsForCalendarYear(portfolioCalendar.year - 1),
    fetchDashboardRecentActivity(6),
  ])

  const portfolioMonthSnapshot = buildPortfolioMonthSnapshot(portfolioBookings, portfolioCalendar.label)
  const portfolioYearThisSnapshot = buildPortfolioYearSnapshot(
    portfolioYearThisBookings,
    portfolioCalendar.year
  )
  const portfolioYearLastSnapshot = buildPortfolioYearSnapshot(
    portfolioYearLastBookings,
    portfolioCalendar.year - 1
  )

  const yoyGross =
    portfolioYearLastSnapshot.grossRevenue > 0
      ? ((portfolioYearThisSnapshot.grossRevenue - portfolioYearLastSnapshot.grossRevenue) /
          portfolioYearLastSnapshot.grossRevenue) *
        100
      : null

  const statusParam =
    parsed.statuses && parsed.statuses.length ? parsed.statuses.join(",") : "all"

  const topProperties = [...analytics.byProperty]
    .sort((a, b) => b.sumGross - a.sumGross)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold spike-heading">Portfolio performance</h2>
              <p className="mt-0.5 text-sm spike-text-muted">
                Revenue and occupancy for {portfolioCalendar.label} (check-in date).
              </p>
            </div>
            <Suspense
              fallback={
                <div className="spike-card h-9 px-3 py-2 text-xs spike-text-muted">
                  Loading…
                </div>
              }
            >
              <DashboardPortfolioMonthFilters activeOffset={portfolioMonthOffset} />
            </Suspense>
          </div>
          <DashboardPortfolioAnalyticsCard
            monthBookings={portfolioBookings}
            monthSnapshot={portfolioMonthSnapshot}
            yearThisBookings={portfolioYearThisBookings}
            yearLastBookings={portfolioYearLastBookings}
            yearThisSnapshot={portfolioYearThisSnapshot}
            yearLastSnapshot={portfolioYearLastSnapshot}
            yearThis={portfolioCalendar.year}
            yearLast={portfolioCalendar.year - 1}
            variant="embedded"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1 xl:gap-6">
          <SpikeStatCard title="Properties" value={totalProperties} icon={Building2} />
          <SpikeStatCard title="Owners" value={totalOwners} icon={Users} />
          <SpikeStatCard
            className="sm:col-span-2 xl:col-span-1"
            title="Active bookings"
            value={activeBookings}
            icon={CalendarCheck}
            trend={
              yoyGross != null
                ? {
                    value: `${yoyGross >= 0 ? "+" : ""}${yoyGross.toFixed(0)}% YoY gross`,
                    positive: yoyGross >= 0,
                  }
                : undefined
            }
          />
          <div className="spike-card p-5 sm:col-span-2 xl:col-span-1">
            <h5 className="spike-card-title mb-2">Year gross revenue</h5>
            <p className="text-2xl font-semibold tracking-tight spike-heading tabular-nums">
              {formatMoney(portfolioYearThisSnapshot.grossRevenue)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="spike-stat-icon spike-stat-icon--danger">
                <span className="spike-stat-icon-inner">
                  <DollarSign className="size-5" />
                </span>
              </span>
              <p className="text-xs spike-text-muted">
                Calendar {portfolioCalendar.year} · excl. cancelled
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-4">
          <DashboardActivityTimeline items={recentActivity} />
        </div>
        <div className="min-w-0 xl:col-span-8">
          <div className="spike-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--spike-glass-border)] px-5 py-4">
              <h5 className="spike-card-title">Top properties by gross</h5>
              <Link href="/dashboard/properties" className="spike-link text-sm font-medium">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="spike-table-head text-left">
                    <th className="px-5 py-3">Property</th>
                    <th className="px-5 py-3 text-right">Bookings</th>
                    <th className="px-5 py-3 text-right">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {topProperties.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center spike-text-muted">
                        No bookings in the selected analytics range.
                      </td>
                    </tr>
                  ) : (
                    topProperties.map((row) => (
                      <tr key={row.propertyId} className="spike-table-row">
                        <td className="px-5 py-3 font-medium spike-heading">
                          <Link
                            href={`/dashboard/properties/${row.propertyId}`}
                            className="spike-link hover:underline"
                          >
                            {row.propertyName}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums spike-text-secondary">{row.count}</td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums spike-heading">
                          {formatMoney(row.sumGross)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold spike-heading">Booking analytics</h2>
          <p className="mt-0.5 text-sm spike-text-muted">
            Filter stays overlapping your date range across the portfolio.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="spike-card p-4 text-sm spike-text-muted">Loading filters…</div>
          }
        >
          <BookingAnalyticsFilters
            properties={propertyOptions}
            initialFrom={format(parsed.from, "yyyy-MM-dd")}
            initialTo={format(parsed.to, "yyyy-MM-dd")}
            initialPropertyId={parsed.propertyId ?? ""}
            initialSource={parsed.source ?? ""}
            initialStatus={statusParam}
            initialScope={parsed.csvOnly ? "csv" : "all"}
          />
        </Suspense>
        <BookingAnalyticsDisplay data={analytics} csvOnly={parsed.csvOnly} />
      </section>
    </div>
  )
}
