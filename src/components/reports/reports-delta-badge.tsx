import { cn } from "@/lib/utils"

export function ReportsDeltaBadge({
  growthPct,
  hasComparison,
}: {
  growthPct?: number
  hasComparison: boolean
}) {
  if (!hasComparison) {
    return <span className="text-xs text-slate-400">— no data for comparison</span>
  }

  if (growthPct === undefined || Number.isNaN(growthPct)) {
    return <span className="text-xs text-slate-400">—</span>
  }

  if (growthPct === 0) {
    return <span className="text-xs text-slate-400">— flat vs previous period</span>
  }

  const isPos = growthPct > 0
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        isPos ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      )}
    >
      {isPos ? "↑" : "↓"} {Math.abs(growthPct).toFixed(1)}% vs prior period
    </span>
  )
}
