"use client"

import {
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Home,
  Trophy,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  generateInsights,
  type ReportInsight,
  type ReportInsightType,
} from "@/lib/reports/generate-insights"
import type { ReportsSummaryResponse } from "@/lib/reports/types"

const insightColors: Record<
  ReportInsightType,
  { bg: string; border: string; icon: string }
> = {
  positive: { bg: "#f0faf4", border: "#86efac", icon: "#1a5c35" },
  warning: { bg: "#fffbeb", border: "#fcd34d", icon: "#92400e" },
  info: { bg: "#eff6ff", border: "#93c5fd", icon: "#1d4ed8" },
}

const ICONS: Record<ReportInsight["icon"], LucideIcon> = {
  Trophy,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Home,
  DollarSign,
}

function InsightCard({ insight }: { insight: ReportInsight }) {
  const colors = insightColors[insight.type]
  const Icon = ICONS[insight.icon]

  return (
    <div
      className="flex items-start gap-3 rounded-lg border p-3"
      style={{
        background: colors.bg,
        borderColor: colors.border,
      }}
    >
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color: colors.icon }} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm text-gray-700">{insight.text}</p>
        <p className="mt-0.5 text-xs font-medium text-gray-900">{insight.value}</p>
      </div>
    </div>
  )
}

export function ReportsInsightsPanel({ data }: { data: ReportsSummaryResponse }) {
  const insights = generateInsights(data)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Insights</h3>
      <p className="mt-0.5 text-sm text-slate-500">Automatically generated observations</p>
      {insights.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {insights.map((insight, i) => (
            <li key={`${insight.icon}-${i}`}>
              <InsightCard insight={insight} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">
          No insights for this period yet.
        </p>
      )}
    </section>
  )
}
