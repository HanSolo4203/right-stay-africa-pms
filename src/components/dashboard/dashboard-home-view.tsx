"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  LayoutGrid,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getTimeOfDayGreeting } from "@/lib/auth/user-display"
import {
  formatLastUpdated,
  formatUpcomingDate,
  OccupancyMiniBar,
  PlatformBadge,
  PROPERTY_DETAIL_PATH,
  PropertyStatusBadge,
  type PropertyStatusKind,
} from "@/lib/dashboard/dashboard-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DashboardApiResponse, DashboardPropertyRow } from "@/lib/dashboard/types"
import { cn } from "@/lib/utils"

const UPCOMING_LIMIT = 5
const AUTO_REFRESH_MS = 5 * 60 * 1000

const PLATFORM_CHART_COLORS: Record<string, string> = {
  Airbnb: "#FF5A5F",
  "Booking.com": "#003580",
  Direct: "#1a5c35",
  Other: "#94a3b8",
}

function platformChartColor(platform: string): string {
  if (PLATFORM_CHART_COLORS[platform]) return PLATFORM_CHART_COLORS[platform]
  const lower = platform.toLowerCase()
  if (lower.includes("airbnb")) return PLATFORM_CHART_COLORS.Airbnb
  if (lower.includes("booking")) return PLATFORM_CHART_COLORS["Booking.com"]
  if (lower.includes("direct")) return PLATFORM_CHART_COLORS.Direct
  return PLATFORM_CHART_COLORS.Other
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n)
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (!previous) {
    return <span className="text-xs spike-text-muted">—</span>
  }
  const pct = ((current - previous) / previous) * 100
  const isPos = pct >= 0
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-xs font-medium",
        isPos
          ? "bg-[rgba(48,209,88,0.18)] text-[var(--spike-accent-green)]"
          : "bg-[rgba(255,55,95,0.18)] text-[var(--spike-accent-pink)]"
      )}
    >
      {isPos ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

type KpiIconTone = "green" | "blue" | "purple" | "amber" | "teal" | "slate"

const KPI_ICON_TONE: Record<KpiIconTone, string> = {
  green: "bg-[rgba(48,209,88,0.15)] text-[var(--spike-accent-green)]",
  blue: "bg-[rgba(90,200,250,0.15)] text-[var(--spike-primary)]",
  purple: "bg-[rgba(191,90,242,0.15)] text-[var(--spike-accent-purple)]",
  amber: "bg-[rgba(255,159,10,0.15)] text-[#ff9f0a]",
  teal: "bg-[rgba(45,212,191,0.15)] text-[#2dd4bf]",
  slate: "bg-[rgba(148,163,184,0.15)] text-slate-400",
}

function DashboardKpiCard({
  title,
  value,
  icon: Icon,
  iconTone,
  footer,
}: {
  title: string
  value: string
  icon: LucideIcon
  iconTone: KpiIconTone
  footer: ReactNode
}) {
  return (
    <div className="spike-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium spike-text-secondary">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums spike-heading">{value}</p>
          <div className="mt-2">{footer}</div>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            KPI_ICON_TONE[iconTone]
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-[rgba(255,255,255,0.08)]" />
        <Skeleton className="h-4 w-48 bg-[rgba(255,255,255,0.06)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-[rgba(255,255,255,0.08)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Skeleton className="h-96 rounded-xl bg-[rgba(255,255,255,0.08)] lg:col-span-3" />
        <Skeleton className="h-96 rounded-xl bg-[rgba(255,255,255,0.08)] lg:col-span-2" />
      </div>
      <Skeleton className="h-64 rounded-xl bg-[rgba(255,255,255,0.08)]" />
    </div>
  )
}

type DashboardHomeViewProps = {
  displayName: string
}

export function DashboardHomeView({ displayName }: DashboardHomeViewProps) {
  const router = useRouter()
  const [data, setData] = useState<DashboardApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("Not updated yet")
  const [propertySearch, setPropertySearch] = useState("")

  const greeting = useMemo(() => getTimeOfDayGreeting(), [])
  const monthLabel = useMemo(() => format(new Date(), "MMMM yyyy"), [])

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setInitialLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Failed to load dashboard (${res.status})`)
      }
      const json = (await res.json()) as DashboardApiResponse
      setData(json)
      setLastUpdatedAt(json.generatedAt)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard(false)
  }, [loadDashboard])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) void loadDashboard(true)
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [loadDashboard])

  useEffect(() => {
    const tick = () => setLastUpdatedLabel(formatLastUpdated(lastUpdatedAt))
    tick()
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [lastUpdatedAt])

  const filteredProperties = useMemo(() => {
    if (!data) return []
    const q = propertySearch.trim().toLowerCase()
    if (!q) return data.propertyBreakdown
    return data.propertyBreakdown.filter((p) => p.propertyName.toLowerCase().includes(q))
  }, [data, propertySearch])

  if (initialLoading && !data) return <DashboardSkeleton />

  if ((error && !data) || !data) {
    return (
      <div className="space-y-4">
        <DashboardHeader
          greeting={greeting}
          displayName={displayName}
          monthLabel={monthLabel}
          refreshing={refreshing}
          lastUpdatedLabel={lastUpdatedLabel}
          onRefresh={() => void loadDashboard(true)}
        />
        <div className="spike-card border border-[var(--spike-accent-pink)]/30 p-6">
          <p className="font-medium text-[var(--spike-accent-pink)]">
            {error ?? "Could not load dashboard"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void loadDashboard(true)}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { kpis, portfolio, upcoming, propertyBreakdown, revenueByPlatform, revenueTrend, attention } =
    data
  const cur = kpis.currentMonth
  const last = kpis.lastMonth
  const noBookings = portfolio.propertiesWithNoBookingsThisMonth

  return (
    <div className="space-y-6">
      <DashboardHeader
        greeting={greeting}
        displayName={displayName}
        monthLabel={monthLabel}
        refreshing={refreshing}
        lastUpdatedLabel={lastUpdatedLabel}
        onRefresh={() => void loadDashboard(true)}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardKpiCard
          title="Gross Revenue"
          value={formatMoney(cur.grossRevenue)}
          icon={TrendingUp}
          iconTone="green"
          footer={
            <p className="flex flex-wrap items-center gap-1.5 text-xs spike-text-muted">
              <DeltaBadge current={cur.grossRevenue} previous={last.grossRevenue} />
              <span>vs last month</span>
            </p>
          }
        />
        <DashboardKpiCard
          title="Management Fees"
          value={formatMoney(cur.managementFees)}
          icon={Banknote}
          iconTone="blue"
          footer={
            <p className="flex flex-wrap items-center gap-1.5 text-xs spike-text-muted">
              <DeltaBadge current={cur.managementFees} previous={last.managementFees} />
              <span>vs last month</span>
            </p>
          }
        />
        <DashboardKpiCard
          title="Owner Payouts"
          value={formatMoney(cur.ownerPayouts)}
          icon={Users}
          iconTone="purple"
          footer={
            <p className="flex flex-wrap items-center gap-1.5 text-xs spike-text-muted">
              <DeltaBadge current={cur.ownerPayouts} previous={last.ownerPayouts} />
              <span>vs last month</span>
            </p>
          }
        />
        <DashboardKpiCard
          title="Bookings"
          value={String(cur.bookingCount)}
          icon={Calendar}
          iconTone="amber"
          footer={
            <p className="text-xs spike-text-muted">{cur.bookedNights} nights booked</p>
          }
        />
        <DashboardKpiCard
          title="Occupancy Rate"
          value={`${cur.occupancyRate.toFixed(1)}%`}
          icon={Building2}
          iconTone="teal"
          footer={
            <div className="space-y-2">
              <p className="text-xs spike-text-muted">
                {cur.bookedNights} of {cur.availableNights} available nights
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]">
                <div
                  className="h-full rounded-full bg-[var(--spike-accent-green)] transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, cur.occupancyRate))}%` }}
                />
              </div>
            </div>
          }
        />
        <DashboardKpiCard
          title="Portfolio"
          value={`${portfolio.totalProperties} properties`}
          icon={LayoutGrid}
          iconTone="slate"
          footer={
            <p
              className={cn(
                "text-xs",
                noBookings > 0 ? "text-[#ff9f0a]" : "spike-text-muted"
              )}
            >
              {portfolio.activeClients} active owners · {noBookings} with no bookings this month
            </p>
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-3">
          <div className="spike-card p-5">
            <h3 className="text-sm font-semibold spike-heading">Revenue — last 6 months</h3>
            <div className="mt-4 h-[220px] w-full min-w-0">
              {revenueTrend.some((m) => m.grossRevenue > 0 || m.managementFees > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `R${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        `R ${Number(value).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="grossRevenue"
                      name="Gross Revenue"
                      fill="#1a5c35"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="managementFees"
                      name="Mgmt Fees"
                      fill="#86efac"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm spike-text-muted">
                  No revenue in the last 6 months.
                </div>
              )}
            </div>
          </div>

          <div className="spike-card p-5">
            <h3 className="text-sm font-semibold spike-heading">
              Revenue by platform — this month
            </h3>
            {revenueByPlatform.length > 0 ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-[180px] min-w-0 flex-1 sm:max-w-[55%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByPlatform}
                        cx="40%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        dataKey="revenue"
                        nameKey="platform"
                      >
                        {revenueByPlatform.map((entry) => (
                          <Cell
                            key={entry.platform}
                            fill={platformChartColor(entry.platform)}
                            stroke="rgba(8, 8, 14, 0.9)"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) =>
                          `R ${Number(v).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="min-w-[200px] flex-1 space-y-2.5">
                  {revenueByPlatform.map((entry) => (
                    <li
                      key={entry.platform}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2 spike-text-secondary">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: platformChartColor(entry.platform) }}
                        />
                        <span className="truncate">{entry.platform}</span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="font-medium spike-heading">
                          {formatMoney(entry.revenue)}
                        </span>
                        <span className="ml-2 text-xs spike-text-muted">
                          {entry.percentage.toFixed(0)}%
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-6 text-center text-sm spike-text-muted">
                No platform revenue this month.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <div className="spike-card flex h-full flex-col overflow-hidden">
            <div className="border-b border-[var(--spike-glass-border)] px-5 py-4">
              <h3 className="spike-card-title">Next 7 days</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <UpcomingSection
                label="Check-ins"
                items={upcoming.checkinsNext7Days}
                dateKey="checkIn"
                moreLabel="check-ins"
              />
              <UpcomingSection
                className="mt-6"
                label="Check-outs"
                items={upcoming.checkoutsNext7Days}
                dateKey="checkOut"
                moreLabel="check-outs"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="spike-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--spike-glass-border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="spike-card-title">Properties this month</h3>
            <p className="mt-0.5 text-xs spike-text-muted">
              {monthLabel} · {portfolio.totalProperties} properties
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 spike-text-muted" />
            <Input
              type="search"
              placeholder="Search properties…"
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              className="h-8 border-[var(--spike-glass-border)] bg-transparent pl-8 text-sm"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="spike-table-head border-[var(--spike-glass-border)] hover:bg-transparent">
              <TableHead className="spike-text-secondary">Property</TableHead>
              <TableHead className="spike-text-secondary">Owner</TableHead>
              <TableHead className="text-right spike-text-secondary">Bookings</TableHead>
              <TableHead className="text-right spike-text-secondary">Nights</TableHead>
              <TableHead className="min-w-[120px] spike-text-secondary">Occupancy</TableHead>
              <TableHead className="text-right spike-text-secondary">Revenue</TableHead>
              <TableHead className="text-right spike-text-secondary">Mgmt fee</TableHead>
              <TableHead className="spike-text-secondary">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProperties.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-8 text-center spike-text-muted">
                  {propertyBreakdown.length === 0
                    ? "No properties in the portfolio."
                    : "No properties match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProperties.map((row) => (
                <PropertyTableRow key={row.propertyId} row={row} onNavigate={router.push} />
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {attention.length > 0 ? (
        <section className="spike-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold spike-heading">
            <AlertTriangle className="size-4 text-[#ff9f0a]" aria-hidden />
            Needs attention
          </h3>
          <ul className="mt-4 space-y-2">
            {attention.map((item) => (
              <li key={`${item.propertyId}-${item.issue}`}>
                <Link
                  href={PROPERTY_DETAIL_PATH(item.propertyId)}
                  className="flex items-start gap-3 rounded-lg border border-[var(--spike-glass-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition hover:bg-[var(--spike-primary-subtle)]"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#ff9f0a]" />
                  <span className="min-w-0">
                    <span className="font-medium spike-heading">{item.propertyName}</span>
                    <span className="mt-0.5 block text-xs spike-text-muted">{item.issue}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function DashboardHeader({
  greeting,
  displayName,
  monthLabel,
  refreshing,
  lastUpdatedLabel,
  onRefresh,
}: {
  greeting: string
  displayName: string
  monthLabel: string
  refreshing: boolean
  lastUpdatedLabel: string
  onRefresh: () => void
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight spike-heading">
          {greeting}, {displayName}
        </h1>
        <p className="mt-1 text-sm spike-text-muted">
          Portfolio overview for {monthLabel}. Pro-rated calendar month (excl. cancelled).
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-[var(--spike-glass-border)] bg-transparent spike-text-secondary hover:bg-[var(--spike-primary-subtle)] hover:spike-heading"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
        <p className="text-[11px] spike-text-muted">{lastUpdatedLabel}</p>
      </div>
    </header>
  )
}

function PropertyTableRow({
  row,
  onNavigate,
}: {
  row: DashboardPropertyRow
  onNavigate: (href: string) => void
}) {
  const href = PROPERTY_DETAIL_PATH(row.propertyId)
  const status = row.status as PropertyStatusKind

  return (
    <TableRow
      className="spike-table-row cursor-pointer border-[var(--spike-glass-border)]"
      onClick={() => onNavigate(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onNavigate(href)
        }
      }}
      tabIndex={0}
      role="link"
    >
      <TableCell>
        <p className="truncate font-semibold spike-heading">{row.propertyName}</p>
        {row.unitNumber ? (
          <p className="truncate text-xs spike-text-muted">Unit {row.unitNumber}</p>
        ) : null}
      </TableCell>
      <TableCell className="spike-text-secondary">{row.ownerName ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{row.bookingCount}</TableCell>
      <TableCell className="text-right tabular-nums">{row.bookedNights}</TableCell>
      <TableCell>
        <OccupancyMiniBar rate={row.occupancyRate} />
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {formatMoney(row.grossRevenue)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(row.managementFee)}</TableCell>
      <TableCell>
        <PropertyStatusBadge status={status} />
        {status === "occupied" && row.currentGuest ? (
          <p className="mt-1 truncate text-xs spike-text-muted">{row.currentGuest}</p>
        ) : null}
        {status === "vacant" && row.nextCheckin ? (
          <p className="mt-1 text-xs spike-text-muted">
            Next: {formatUpcomingDate(row.nextCheckin)}
          </p>
        ) : null}
      </TableCell>
    </TableRow>
  )
}

function UpcomingSection({
  label,
  items,
  dateKey,
  moreLabel,
  className,
}: {
  label: string
  items: DashboardApiResponse["upcoming"]["checkinsNext7Days"]
  dateKey: "checkIn" | "checkOut"
  moreLabel: "check-ins" | "check-outs"
  className?: string
}) {
  const visible = items.slice(0, UPCOMING_LIMIT)
  const remaining = items.length - visible.length
  const emptyMessage =
    moreLabel === "check-ins"
      ? "No check-ins in the next 7 days"
      : "No check-outs in the next 7 days"

  return (
    <section className={className}>
      <p className="spike-nav-cap !mx-0 !mt-0">{label}</p>
      <ul className="mt-2 space-y-2">
        {items.length === 0 ? (
          <li className="py-2 text-xs spike-text-muted">{emptyMessage}</li>
        ) : (
          visible.map((item) => (
            <li key={`${item.bookingId}-${dateKey}`}>
              <Link
                href={PROPERTY_DETAIL_PATH(item.propertyId)}
                className="block rounded-lg border border-[var(--spike-glass-border)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition hover:bg-[var(--spike-primary-subtle)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium spike-heading">{item.guestName}</p>
                    <p className="truncate text-xs spike-text-muted">{item.propertyName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <PlatformBadge platform={item.platform} />
                      <span className="text-[11px] spike-text-muted">
                        {item.nights} night{item.nights === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 text-xs font-semibold tabular-nums spike-heading">
                    {formatUpcomingDate(item[dateKey])}
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
      {remaining > 0 ? (
        <p className="mt-2 text-xs spike-text-muted">
          + {remaining} more {moreLabel}
        </p>
      ) : null}
    </section>
  )
}
