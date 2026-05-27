"use client"

import { cn } from "@/lib/utils"
import type { MaintenanceStatsDto } from "@/types/maintenance"

type StatKey = "urgent" | "open" | "inProgress" | "completedThisMonth"

const CHIPS: Array<{
  key: StatKey
  label: string
  dotClass: string
  filterStatus?: string
  filterPriority?: string
}> = [
  { key: "urgent", label: "Urgent", dotClass: "bg-[#ef4444]", filterPriority: "urgent" },
  { key: "open", label: "Open", dotClass: "bg-[#f59e0b]", filterStatus: "open" },
  { key: "inProgress", label: "In progress", dotClass: "bg-[#3b82f6]", filterStatus: "in_progress" },
  {
    key: "completedThisMonth",
    label: "Completed this month",
    dotClass: "bg-[#22c55e]",
    filterStatus: "completed",
  },
]

type MaintenanceStatsProps = {
  stats: MaintenanceStatsDto
  activeStatus?: string
  activePriority?: string
  onFilter: (status?: string, priority?: string) => void
  propertyScoped?: boolean
}

export function MaintenanceStats({
  stats,
  activeStatus,
  activePriority,
  onFilter,
}: MaintenanceStatsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => {
        const count = stats[chip.key]
        const isActive =
          (chip.filterStatus && activeStatus === chip.filterStatus && !activePriority) ||
          (chip.filterPriority && activePriority === chip.filterPriority && !activeStatus)

        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onFilter(chip.filterStatus, chip.filterPriority)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
              isActive
                ? "border-[var(--spike-primary)] bg-[var(--spike-primary-subtle)]"
                : "border-[var(--spike-glass-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[var(--spike-primary-subtle)]"
            )}
          >
            <span className={cn("size-2 rounded-full", chip.dotClass)} aria-hidden />
            <span className="font-bold tabular-nums spike-heading">{count}</span>
            <span className="spike-text-muted">{chip.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function computePropertyStats(
  jobs: Array<{ status: string; priority: string; completedAt: string | null }>,
  globalStats?: MaintenanceStatsDto
): MaintenanceStatsDto {
  if (!jobs.length && globalStats) return globalStats

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    open: jobs.filter((j) => j.status === "open").length,
    inProgress: jobs.filter((j) => j.status === "in_progress").length,
    urgent: jobs.filter(
      (j) => (j.status === "open" || j.status === "in_progress") && j.priority === "urgent"
    ).length,
    completedThisMonth: jobs.filter((j) => {
      if (j.status !== "completed" || !j.completedAt) return false
      return new Date(j.completedAt) >= startOfMonth
    }).length,
  }
}
