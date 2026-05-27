import type { ReportsSummaryResponse } from "@/lib/reports/types"

export type ReportInsightType = "positive" | "warning" | "info"

export type ReportInsight = {
  type: ReportInsightType
  icon:
    | "Trophy"
    | "AlertTriangle"
    | "AlertCircle"
    | "TrendingUp"
    | "Home"
    | "DollarSign"
  text: string
  value: string
}

export function generateInsights(data: ReportsSummaryResponse): ReportInsight[] {
  const insights: ReportInsight[] = []

  const top = data.topProperties.byManagementFees[0]
  if (top) {
    insights.push({
      type: "positive",
      icon: "Trophy",
      text: `${top.name} generated the most management fees`,
      value: `R ${top.value.toLocaleString("en-ZA")}`,
    })
  }

  const lowOccupancy = data.propertyBreakdown.filter(
    (p) => p.occupancyRate < 30 && p.bookings > 0
  )
  if (lowOccupancy.length > 0) {
    insights.push({
      type: "warning",
      icon: "AlertTriangle",
      text: `${lowOccupancy.length} ${lowOccupancy.length === 1 ? "property has" : "properties have"} occupancy below 30%`,
      value: lowOccupancy.map((p) => p.propertyName).join(", "),
    })
  }

  const topPlatform = data.platformBreakdown[0]
  if (topPlatform && topPlatform.revenueShare > 70) {
    insights.push({
      type: "warning",
      icon: "AlertCircle",
      text: `${topPlatform.platform} accounts for over ${Math.round(topPlatform.revenueShare)}% of revenue`,
      value: "Consider diversifying platforms",
    })
  }

  const bestRate = [...data.platformBreakdown].sort(
    (a, b) => b.averageNightlyRate - a.averageNightlyRate
  )[0]
  if (bestRate && bestRate.averageNightlyRate > 0) {
    insights.push({
      type: "positive",
      icon: "TrendingUp",
      text: `${bestRate.platform} has the highest average nightly rate`,
      value: `R ${bestRate.averageNightlyRate.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}/night`,
    })
  }

  if (data.yoyComparison && data.yoyComparison.feeGrowthPct > 0) {
    insights.push({
      type: "positive",
      icon: "TrendingUp",
      text: `Management fees up ${data.yoyComparison.feeGrowthPct.toFixed(1)}% vs same period last year`,
      value: `R ${data.yoyComparison.currentPeriodFees.toLocaleString("en-ZA")} vs R ${data.yoyComparison.previousPeriodFees.toLocaleString("en-ZA")}`,
    })
  }

  const vacant = data.propertyBreakdown.filter((p) => p.bookings === 0)
  if (vacant.length > 0) {
    insights.push({
      type: "warning",
      icon: "Home",
      text: `${vacant.length} ${vacant.length === 1 ? "property has" : "properties have"} no bookings this period`,
      value: vacant
        .slice(0, 3)
        .map((p) => p.propertyName)
        .join(", "),
    })
  }

  if (data.portfolio.averageBookingValue > 0) {
    insights.push({
      type: "info",
      icon: "DollarSign",
      text: "Average booking value this period",
      value: `R ${data.portfolio.averageBookingValue.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`,
    })
  }

  return insights
}
