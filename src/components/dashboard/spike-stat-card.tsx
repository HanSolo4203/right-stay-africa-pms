import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type SpikeStatCardProps = {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; positive?: boolean }
  iconTone?: "primary" | "danger"
  className?: string
}

export function SpikeStatCard({
  title,
  value,
  icon: Icon,
  trend,
  iconTone = "primary",
  className,
}: SpikeStatCardProps) {
  return (
    <div className={cn("spike-card flex h-full flex-col p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 className="mb-2 text-sm font-medium spike-text-secondary">{title}</h5>
          <p className="text-2xl font-semibold tracking-tight spike-heading tabular-nums">{value}</p>
          {trend ? (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs font-bold",
                  trend.positive
                    ? "bg-[rgba(48,209,88,0.18)] text-[var(--spike-accent-green)]"
                    : "bg-[rgba(255,55,95,0.18)] text-[var(--spike-accent-pink)]"
                )}
              >
                {trend.positive ? "↑" : "↓"}
              </span>
              <span className="text-sm font-medium spike-text-secondary">{trend.value}</span>
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "spike-stat-icon",
            iconTone === "danger" && "spike-stat-icon--danger"
          )}
        >
          <div className="spike-stat-icon-inner">
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  )
}
