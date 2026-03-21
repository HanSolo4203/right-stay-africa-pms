import Link from "next/link"
import { Suspense } from "react"
import { format } from "date-fns"
import { BookingStatus } from "@prisma/client"
import { BookingAnalyticsDisplay } from "@/components/dashboard/booking-analytics-display"
import { BookingAnalyticsFilters } from "@/components/dashboard/booking-analytics-filters"
import { DashboardPortfolioAnalyticsCard } from "@/components/dashboard/dashboard-portfolio-analytics-card"
import { DashboardPortfolioMonthFilters } from "@/components/dashboard/dashboard-portfolio-month-filters"
import { prisma } from "@/lib/prisma"
import { getUser } from "@/lib/auth/get-user"
import {
  getBookingAnalytics,
  parseBookingAnalyticsSearchParams,
  sanitizePropertyFilter,
} from "@/lib/booking-analytics"
import {
  buildPortfolioMonthSnapshot,
  buildPortfolioYearSnapshot,
  calendarMonthFromOffset,
  fetchPortfolioBookingsForCalendarMonth,
  fetchPortfolioBookingsForCalendarYear,
  parsePortfolioMonthParam,
} from "@/lib/portfolio-month-analytics"

function formatName(email: string | null) {
  if (!email) return "there"
  const username = email.split("@")[0] ?? ""
  if (!username) return "there"
  return username.charAt(0).toUpperCase() + username.slice(1)
}

type DashboardHomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardHomePage({ searchParams }: DashboardHomePageProps) {
  const user = await getUser()

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

  const stats = [
    { label: "Total Properties", value: totalProperties },
    { label: "Total Owners", value: totalOwners },
    { label: "Active Bookings", value: activeBookings },
  ]

  const statusParam =
    parsed.statuses && parsed.statuses.length
      ? parsed.statuses.join(",")
      : "all"

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Welcome back, {formatName(user?.email ?? null)}.</h2>
        <p className="mt-1 text-sm text-slate-600">
          Here is a quick overview of your Right Stay Africa portfolio.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <div>
        <Link href="/dashboard/properties" className="text-sm font-semibold text-green-700 hover:text-green-800">
          View all properties
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Portfolio analytics</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Same charts and KPIs as the property overview, for all listings — by calendar month (check-in date).
            </p>
          </div>
          <Suspense
            fallback={
              <div className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400">
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
        />
      </section>

      <Suspense
        fallback={
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Loading filters…
          </div>
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
    </div>
  )
}
