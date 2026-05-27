import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MaintenanceJobPriority } from "@/lib/validations/maintenance"

const PRIORITY_STYLES: Record<MaintenanceJobPriority, string> = {
  urgent: "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]",
  high: "bg-[rgba(249,115,22,0.15)] text-[#f97316] border-[rgba(249,115,22,0.3)]",
  medium: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)]",
  low: "bg-[rgba(148,163,184,0.15)] text-[#94a3b8] border-[rgba(148,163,184,0.3)]",
}

const PRIORITY_LABELS: Record<MaintenanceJobPriority, string> = {
  urgent: "URGENT",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: string
  className?: string
}) {
  const key = priority as MaintenanceJobPriority
  const style = PRIORITY_STYLES[key] ?? PRIORITY_STYLES.medium
  const label = PRIORITY_LABELS[key] ?? priority.toUpperCase()

  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", style, className)}>
      {label}
    </Badge>
  )
}
