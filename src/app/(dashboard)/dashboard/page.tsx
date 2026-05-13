import Link from "next/link"
import { Suspense } from "react"
import { format } from "date-fns"
import { ArrowUpRight, Building2, CalendarCheck, Users } from "lucide-react"
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
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

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
    { label: "Total properties", value: totalProperties, icon: Building2 },
    { label: "Total owners", value: totalOwners, icon: Users },
    { label: "Active bookings", value: activeBookings, icon: CalendarCheck },
  ] as const

  const statusParam =
    parsed.statuses && parsed.statuses.length
      ? parsed.statuses.join(",")
      : "all"

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-emerald-500/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-700/90 uppercase">Overview</p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Welcome back, {formatName(user?.email ?? null)}
            </h1>
            <p className="text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
              Portfolio health, occupancy signals, and booking analytics in one place — tuned for how you run Right
              Stay Africa.
            </p>
          </div>
          <Link
            href="/dashboard/properties"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:border-emerald-300/80 hover:bg-white hover:text-emerald-900"
          >
            View properties
            <ArrowUpRight className="size-4 opacity-70" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <Card
              key={item.label}
              size="sm"
              className="border-slate-200/80 bg-white/90 shadow-sm ring-slate-900/[0.03] backdrop-blur-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
                <div>
                  <CardTitle className="text-sm font-medium text-slate-500">{item.label}</CardTitle>
                  <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {item.value}
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10">
                  <Icon className="size-5" aria-hidden />
                </span>
              </CardHeader>
            </Card>
          )
        })}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Portfolio analytics</h2>
            <p className="max-w-prose text-sm text-slate-600">
              Same charts and KPIs as the property overview, for all listings — by calendar month (check-in date).
            </p>
          </div>
          <Suspense
            fallback={
              <div className="h-9 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs text-slate-400 shadow-sm ring-1 ring-slate-900/[0.03]">
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
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-sm">
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
