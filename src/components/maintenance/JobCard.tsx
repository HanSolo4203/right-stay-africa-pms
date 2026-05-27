"use client"

import { format, isBefore, startOfDay } from "date-fns"
import { MoreHorizontal } from "lucide-react"
import { CategoryBadge } from "@/components/maintenance/CategoryBadge"
import { PriorityBadge } from "@/components/maintenance/PriorityBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PRIORITY_BORDER } from "@/lib/maintenance/constants"
import { cn } from "@/lib/utils"
import type { MaintenanceJobDto } from "@/types/maintenance"

function formatCost(job: MaintenanceJobDto) {
  const amount = job.actualCost ?? job.estimatedCost
  if (amount == null) return null
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount)
}

type JobCardProps = {
  job: MaintenanceJobDto
  onOpen: (job: MaintenanceJobDto) => void
  onEdit: (job: MaintenanceJobDto) => void
  onStatusChange: (job: MaintenanceJobDto, status: string) => void
}

export function JobCard({ job, onOpen, onEdit, onStatusChange }: JobCardProps) {
  const contractorName = job.contractor?.name ?? job.contractorName
  const cost = formatCost(job)
  const priorityBar =
    job.priority === "urgent"
      ? "bg-[#ef4444]"
      : job.priority === "high"
        ? "bg-[#f97316]"
        : job.priority === "medium"
          ? "bg-[#f59e0b]"
          : "bg-[#94a3b8]"

  const overdue =
    job.scheduledFor &&
    isBefore(startOfDay(new Date(job.scheduledFor)), startOfDay(new Date())) &&
    job.status !== "completed" &&
    job.status !== "cancelled"

  return (
    <div
      className={cn(
        "spike-card cursor-pointer overflow-hidden transition hover:border-[var(--spike-primary)]",
        PRIORITY_BORDER[job.priority]?.replace("border-l-", "ring-1 ring-") ?? ""
      )}
      onClick={() => onOpen(job)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(job)
        }
      }}
    >
      <div className={cn("h-1", priorityBar)} />
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs spike-text-muted">{job.property?.name ?? "—"}</p>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Job actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpen(job)}>View details</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(job)}>Edit</DropdownMenuItem>
                {job.status === "open" ? (
                  <DropdownMenuItem onClick={() => onStatusChange(job, "in_progress")}>
                    Mark in progress
                  </DropdownMenuItem>
                ) : null}
                {job.status === "open" || job.status === "in_progress" ? (
                  <DropdownMenuItem onClick={() => onStatusChange(job, "completed")}>
                    Mark completed
                  </DropdownMenuItem>
                ) : null}
                {job.status !== "completed" ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-[#ef4444]"
                      onClick={() => onStatusChange(job, "cancelled")}
                    >
                      Cancel job
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="font-semibold leading-snug spike-heading">{job.title}</p>
        <CategoryBadge category={job.category} />
        <p className="text-xs spike-text-secondary">
          {contractorName ?? <span className="italic spike-text-muted">Unassigned</span>}
        </p>
        {job.scheduledFor ? (
          <p className={cn("text-xs", overdue ? "text-[#ef4444]" : "spike-text-muted")}>
            {format(new Date(job.scheduledFor), "EEE d MMM")}
            {overdue ? " · Overdue" : ""}
          </p>
        ) : null}
        {cost ? <p className="text-xs tabular-nums spike-text-secondary">{cost}</p> : null}
        {job.priority === "urgent" ? <PriorityBadge priority="urgent" /> : null}
      </div>
    </div>
  )
}
