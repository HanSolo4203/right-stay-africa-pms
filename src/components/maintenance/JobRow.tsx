"use client"

import { format, isBefore, startOfDay } from "date-fns"
import { MoreHorizontal } from "lucide-react"
import { CategoryBadge } from "@/components/maintenance/CategoryBadge"
import { PriorityBadge } from "@/components/maintenance/PriorityBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { PRIORITY_BORDER } from "@/lib/maintenance/constants"
import { cn } from "@/lib/utils"
import type { MaintenanceJobDto } from "@/types/maintenance"

const STATUS_BADGE: Record<string, string> = {
  open: "bg-slate-100 text-slate-700 dark:bg-[rgba(148,163,184,0.15)] dark:text-slate-300",
  in_progress: "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]",
  completed: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
  cancelled: "bg-[rgba(148,163,184,0.1)] text-slate-400",
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

function formatCost(job: MaintenanceJobDto) {
  if (job.actualCost != null) {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
      job.actualCost
    )
  }
  if (job.estimatedCost != null) {
    return `est. ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(job.estimatedCost)}`
  }
  return "—"
}

function formatScheduled(date: string | null, status: string) {
  if (!date) return { text: "—", overdue: false }
  const d = new Date(date)
  const today = startOfDay(new Date())
  const overdue =
    isBefore(startOfDay(d), today) && status !== "completed" && status !== "cancelled"
  return { text: format(d, "EEE d MMM"), overdue }
}

type JobRowProps = {
  job: MaintenanceJobDto
  onOpen: (job: MaintenanceJobDto) => void
  onEdit: (job: MaintenanceJobDto) => void
  onStatusChange: (job: MaintenanceJobDto, status: string) => void
}

export function JobRow({ job, onOpen, onEdit, onStatusChange }: JobRowProps) {
  const contractorName = job.contractor?.name ?? job.contractorName
  const contractorPhone = job.contractor?.phone ?? job.contractorPhone
  const scheduled = formatScheduled(job.scheduledFor, job.status)
  const border = PRIORITY_BORDER[job.priority] ?? PRIORITY_BORDER.medium

  return (
    <TableRow
      className={cn("spike-table-row cursor-pointer border-l-4 border-[var(--spike-glass-border)]", border)}
      onClick={() => onOpen(job)}
    >
      <TableCell className="w-[90px]">
        <PriorityBadge priority={job.priority} />
      </TableCell>
      <TableCell>
        <p className="font-medium spike-heading">{job.property?.name ?? "—"}</p>
        {job.property?.unitNumber ? (
          <p className="text-xs spike-text-muted">{job.property.unitNumber}</p>
        ) : null}
      </TableCell>
      <TableCell className="max-w-[240px]">
        <p className="truncate font-medium spike-heading">
          {job.title.length > 50 ? `${job.title.slice(0, 50)}…` : job.title}
        </p>
        <div className="mt-1">
          <CategoryBadge category={job.category} />
        </div>
      </TableCell>
      <TableCell>
        {contractorName ? (
          <>
            <p className="text-sm">{contractorName}</p>
            {contractorPhone ? (
              <p className="text-xs spike-text-muted">{contractorPhone}</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm italic spike-text-muted">Unassigned</p>
        )}
      </TableCell>
      <TableCell>
        {scheduled.overdue ? (
          <div>
            <p className="text-sm font-medium text-[#ef4444]">{scheduled.text}</p>
            <p className="text-xs text-[#ef4444]">Overdue</p>
          </div>
        ) : (
          <span className="text-sm spike-text-secondary">{scheduled.text}</span>
        )}
      </TableCell>
      <TableCell className="text-sm tabular-nums spike-text-secondary">{formatCost(job)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("font-normal", STATUS_BADGE[job.status])}>
          {STATUS_LABEL[job.status] ?? job.status}
        </Badge>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
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
      </TableCell>
    </TableRow>
  )
}
