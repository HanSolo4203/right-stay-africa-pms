import type { DashboardActivityItem } from "@/lib/dashboard/types"
import { cn } from "@/lib/utils"

export type { DashboardActivityItem }

const ACCENT_BORDER: Record<DashboardActivityItem["accent"], string> = {
  primary: "border-[var(--spike-primary)]",
  info: "border-[var(--spike-accent-cyan)]",
  success: "border-[var(--spike-accent-green)]",
  warning: "border-[var(--spike-accent-orange)]",
  danger: "border-[var(--spike-accent-pink)]",
}

type DashboardActivityTimelineProps = {
  items: DashboardActivityItem[]
}

export function DashboardActivityTimeline({ items }: DashboardActivityTimelineProps) {
  return (
    <div className="spike-card p-5">
      <h5 className="spike-card-title mb-4">Recent activity</h5>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm spike-text-muted">No recent bookings.</p>
      ) : (
        <ul className="relative mb-0 space-y-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="spike-timeline-item relative flex gap-3 overflow-hidden py-3"
            >
              <div className="w-14 shrink-0 text-end text-xs font-medium spike-heading tabular-nums">
                {item.timeLabel}
              </div>
              <div className="flex shrink-0 flex-col items-center pt-0.5">
                <span
                  className={cn(
                    "spike-timeline-dot my-1 size-2.5 shrink-0 rounded-full",
                    ACCENT_BORDER[item.accent]
                  )}
                />
              </div>
              <p className="mt-0 min-w-0 flex-1 text-sm leading-snug spike-text-secondary">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
