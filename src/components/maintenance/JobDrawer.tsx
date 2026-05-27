"use client"

import { useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Building2, ExternalLink } from "lucide-react"
import { CategoryBadge } from "@/components/maintenance/CategoryBadge"
import { JobStatusActions } from "@/components/maintenance/JobStatusActions"
import { PriorityBadge } from "@/components/maintenance/PriorityBadge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PROPERTY_DETAIL_PATH } from "@/lib/dashboard/dashboard-ui"
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

type JobDrawerProps = {
  open: boolean
  job: MaintenanceJobDto | null
  saving?: boolean
  expenseMonth?: number
  expenseYear?: number
  onOpenChange: (open: boolean) => void
  onStatusChange: (
    job: MaintenanceJobDto,
    status: string,
    payload?: { actualCost?: number; chargeToOwner: boolean; ownerStatementNote?: string }
  ) => void
}

export function JobDrawer({
  open,
  job,
  saving,
  expenseMonth,
  expenseYear,
  onOpenChange,
  onStatusChange,
}: JobDrawerProps) {
  const contractorName = job?.contractor?.name ?? job?.contractorName
  const contractorPhone = job?.contractor?.phone ?? job?.contractorPhone

  const notes = useMemo(() => job?.noteEntries ?? [], [job])

  if (!job) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[520px] border-l border-[var(--spike-glass-border)]">
        <SheetHeader className="border-b border-[var(--spike-glass-border)] pb-3">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={job.priority} />
            <Badge
              variant="outline"
              className={cn("font-normal", STATUS_BADGE[job.status])}
            >
              {STATUS_LABEL[job.status] ?? job.status}
            </Badge>
          </div>
          <SheetTitle className="mt-2 text-lg font-semibold leading-snug spike-heading">
            {job.title}
          </SheetTitle>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs spike-text-muted">
            <Link
              href={PROPERTY_DETAIL_PATH(job.propertyId)}
              className="inline-flex items-center gap-1 hover:text-[var(--spike-primary)]"
            >
              <Building2 className="size-3.5" />
              <span className="truncate">
                {job.property?.name}
                {job.property?.unitNumber ? ` · ${job.property.unitNumber}` : ""}
              </span>
              <ExternalLink className="size-3" />
            </Link>
            <span>
              Reported{" "}
              {format(new Date(job.reportedAt), "EEE d MMM yyyy")}
            </span>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <Tabs defaultValue="details">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes &amp; History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <DetailRow label="Category">
                  <CategoryBadge category={job.category} />
                </DetailRow>
                <DetailRow label="Reported">
                  {format(new Date(job.reportedAt), "EEE d MMM yyyy")}
                </DetailRow>
                <DetailRow label="Scheduled for">
                  {job.scheduledFor
                    ? format(new Date(job.scheduledFor), "EEE d MMM yyyy")
                    : "—"}
                </DetailRow>
                <DetailRow label="Due by">
                  {job.dueBy ? format(new Date(job.dueBy), "EEE d MMM yyyy") : "—"}
                </DetailRow>
                <DetailRow label="Contractor">
                  {contractorName ?? <span className="italic">Unassigned</span>}
                </DetailRow>
                <DetailRow label="Contractor phone">
                  {contractorPhone ?? "—"}
                </DetailRow>
                <DetailRow label="Estimated cost">
                  {job.estimatedCost != null
                    ? formatCurrency(job.estimatedCost)
                    : "—"}
                </DetailRow>
                <DetailRow label="Actual cost">
                  {job.actualCost != null ? formatCurrency(job.actualCost) : "—"}
                </DetailRow>
              </div>

              <Card className="bg-[rgba(255,255,255,0.02)]">
                <CardContent className="space-y-3 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium spike-text-secondary">Cost</span>
                    {job.chargeToOwner ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-[rgba(16,185,129,0.1)] text-[11px] text-emerald-500"
                      >
                        Charges to owner statement
                      </Badge>
                    ) : null}
                  </div>
                  {job.ownerStatementNote ? (
                    <p className="text-xs spike-text-muted">
                      Statement description: {job.ownerStatementNote}
                    </p>
                  ) : null}
                  {job.status === "completed" && expenseMonth && expenseYear ? (
                    <p className="text-xs text-emerald-500">
                      ✓ Added to{" "}
                      {new Date(expenseYear, expenseMonth - 1, 1).toLocaleDateString(
                        "en-ZA",
                        { month: "long", year: "numeric" }
                      )}{" "}
                      statement
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {job.description ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium spike-text-secondary">Description</p>
                  <p className="text-sm leading-relaxed spike-text-secondary whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>
              ) : null}

              <Separator />

              <JobStatusActions
                job={job}
                saving={saving}
                onStatusChange={(status, payload) =>
                  onStatusChange(job, status, payload)
                }
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3">
              <Card className="bg-[rgba(255,255,255,0.02)]">
                <CardContent className="space-y-2 p-3">
                  {notes.length === 0 ? (
                    <p className="text-xs spike-text-muted">No activity yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {notes.map((entry, idx) => (
                        <li key={idx} className="text-xs leading-relaxed spike-text-secondary">
                          <span className="block text-[11px] uppercase tracking-wide spike-text-muted">
                            {format(new Date(entry.createdAt), "EEE d MMM yyyy HH:mm")}
                            {" · "}
                            {entry.type === "system" ? "System" : "Note"}
                          </span>
                          <span>{entry.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide spike-text-muted">
        {label}
      </p>
      <p className="text-xs spike-text-secondary">{children}</p>
    </div>
  )
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(n)
}

