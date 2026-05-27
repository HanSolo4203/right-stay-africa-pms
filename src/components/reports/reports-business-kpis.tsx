"use client"

import {
  Banknote,
  Building2,
  Calendar,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { ReportsDeltaBadge } from "@/components/reports/reports-delta-badge"
import type { ReportsSummaryResponse } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n)
}

function BusinessKpiCard({
  title,
  value,
  sub,
  icon: Icon,
  iconClass,
  footer,
  children,
}: {
  title: string
  value: string
  sub: string
  icon: LucideIcon
  iconClass: string
  footer?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
          {footer ? <div className="mt-2">{footer}</div> : null}
          {children}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconClass
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  )
}

export function ReportsBusinessKpis({ data }: { data: ReportsSummaryResponse }) {
  const { business, portfolio, periodComparison } = data
  const hasCmp = periodComparison != null

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <BusinessKpiCard
        title="Total Management Fees Earned"
        value={formatMoney(business.totalManagementFees)}
        sub="Commission (Statements preview)"
        icon={Banknote}
        iconClass="bg-emerald-50 text-emerald-700"
        footer={
          <ReportsDeltaBadge
            hasComparison={hasCmp}
            growthPct={periodComparison?.managementFeesGrowthPct}
          />
        }
      />
      <BusinessKpiCard
        title="Total Revenue Managed"
        value={formatMoney(business.totalRevenueManaged)}
        sub="Gross revenue (Statements preview)"
        icon={TrendingUp}
        iconClass="bg-blue-50 text-blue-700"
        footer={
          <ReportsDeltaBadge
            hasComparison={hasCmp}
            growthPct={periodComparison?.revenueGrowthPct}
          />
        }
      />
      <BusinessKpiCard
        title="Owner Payouts Processed"
        value={formatMoney(business.totalOwnerPayouts)}
        sub="Net to owners (Statements preview)"
        icon={Users}
        iconClass="bg-purple-50 text-purple-700"
        footer={
          <ReportsDeltaBadge
            hasComparison={hasCmp}
            growthPct={periodComparison?.ownerPayoutsGrowthPct}
          />
        }
      />
      <BusinessKpiCard
        title="Portfolio Occupancy"
        value={`${portfolio.occupancyRate.toFixed(1)}%`}
        sub={`${portfolio.totalNights} nights across ${portfolio.activeProperties} properties with figures`}
        icon={Building2}
        iconClass="bg-teal-50 text-teal-700"
      >
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-teal-500 transition-all"
            style={{ width: `${Math.min(100, portfolio.occupancyRate)}%` }}
          />
        </div>
      </BusinessKpiCard>
      <BusinessKpiCard
        title="Average Management Fee Rate"
        value={`${business.averageManagementFeeRate.toFixed(1)}%`}
        sub="Weighted average across portfolio"
        icon={Percent}
        iconClass="bg-amber-50 text-amber-700"
      />
      <BusinessKpiCard
        title="Bookings Processed"
        value={String(portfolio.totalBookings)}
        sub={`Avg ${formatMoney(portfolio.averageBookingValue)} per booking`}
        icon={Calendar}
        iconClass="bg-slate-100 text-slate-600"
        footer={
          <ReportsDeltaBadge
            hasComparison={hasCmp}
            growthPct={periodComparison?.bookingsGrowthPct}
          />
        }
      />
    </section>
  )
}
