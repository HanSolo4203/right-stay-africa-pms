import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CATEGORY_LABELS } from "@/lib/maintenance/constants"
import type { MaintenanceJobCategory } from "@/lib/validations/maintenance"

export function CategoryBadge({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  const label =
    CATEGORY_LABELS[category as MaintenanceJobCategory] ??
    category.replace(/_/g, " ")

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-[var(--spike-glass-border)] bg-[rgba(148,163,184,0.1)] text-[11px] font-normal capitalize spike-text-secondary",
        className
      )}
    >
      {label}
    </Badge>
  )
}
