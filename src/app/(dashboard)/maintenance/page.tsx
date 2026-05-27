"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, LayoutList, LayoutGrid } from "lucide-react"
import { JobCard } from "@/components/maintenance/JobCard"
import { JobDrawer } from "@/components/maintenance/JobDrawer"
import { JobForm } from "@/components/maintenance/JobForm"
import { JobRow } from "@/components/maintenance/JobRow"
import {
  MaintenanceFilters,
  type MaintenanceFilterState,
  filterMaintenanceJobs,
} from "@/components/maintenance/MaintenanceFilters"
import { MaintenanceStats } from "@/components/maintenance/MaintenanceStats"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { PRIORITY_ORDER } from "@/lib/maintenance/constants"
import type { ContractorDto, MaintenanceJobDto, MaintenanceStatsDto, PropertyOption } from "@/types/maintenance"

const VIEW_KEY = "maintenance_view"
type ViewMode = "list" | "board"

type JobsResponse = {
  jobs: MaintenanceJobDto[]
}

export default function MaintenancePage() {
  const [jobs, setJobs] = useState<MaintenanceJobDto[]>([])
  const [stats, setStats] = useState<MaintenanceStatsDto | null>(null)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [contractors, setContractors] = useState<ContractorDto[]>([])
  const [filters, setFilters] = useState<MaintenanceFilterState>({
    search: "",
    propertyId: "",
    status: "",
    priority: "",
    category: "",
  })
  const [view, setView] = useState<ViewMode>("list")
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerJob, setDrawerJob] = useState<MaintenanceJobDto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formJob, setFormJob] = useState<MaintenanceJobDto | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [expenseMonth, setExpenseMonth] = useState<number | undefined>()
  const [expenseYear, setExpenseYear] = useState<number | undefined>()

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_KEY)
    if (stored === "list" || stored === "board") setView(stored)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(VIEW_KEY, view)
  }, [view])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [jobsRes, statsRes, propsRes, contractorsRes] = await Promise.all([
          fetch("/api/maintenance"),
          fetch("/api/maintenance/stats"),
          fetch("/api/properties"),
          fetch("/api/contractors"),
        ])

        if (!jobsRes.ok) throw new Error("Failed to load jobs")
        const { jobs } = (await jobsRes.json()) as JobsResponse

        const statsJson = statsRes.ok
          ? ((await statsRes.json()) as MaintenanceStatsDto)
          : null

        const propsJson = propsRes.ok
          ? ((await propsRes.json()) as { properties: Array<{ id: string; name: string; uplisting_id: string | null }> })
          : { properties: [] }

        const contractorsJson = contractorsRes.ok
          ? ((await contractorsRes.json()) as { contractors: ContractorDto[] })
          : { contractors: [] }

        if (cancelled) return
        setJobs(sortJobs(jobs))
        setStats(
          statsJson ?? {
            open: 0,
            inProgress: 0,
            urgent: 0,
            completedThisMonth: 0,
          }
        )
        setProperties(
          propsJson.properties.map((p) => ({
            id: p.id,
            name: p.name,
            unitNumber: null,
          }))
        )
        setContractors(contractorsJson.contractors)
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load maintenance.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () => filterMaintenanceJobs(jobs, filters),
    [jobs, filters]
  )

  const boardColumns: Record<string, MaintenanceJobDto[]> = useMemo(
    () => ({
      open: filtered.filter((j) => j.status === "open"),
      in_progress: filtered.filter((j) => j.status === "in_progress"),
      completed: filtered.filter((j) => j.status === "completed"),
      cancelled: filtered.filter((j) => j.status === "cancelled"),
    }),
    [filtered]
  )

  const currentStats: MaintenanceStatsDto = useMemo(
    () =>
      stats ?? {
        open: jobs.filter((j) => j.status === "open").length,
        inProgress: jobs.filter((j) => j.status === "in_progress").length,
        urgent: jobs.filter(
          (j) =>
            (j.status === "open" || j.status === "in_progress") &&
            j.priority === "urgent"
        ).length,
        completedThisMonth: jobs.filter(
          (j) => j.status === "completed" && !!j.completedAt
        ).length,
      },
    [stats, jobs]
  )

  const onStatusChange = async (
    job: MaintenanceJobDto,
    status: MaintenanceJobDto["status"],
    payload?: { actualCost?: number; chargeToOwner: boolean; ownerStatementNote?: string }
  ) => {
    setStatusSaving(true)
    setExpenseMonth(undefined)
    setExpenseYear(undefined)
    const prevJobs = jobs
    const optimistic = jobs.map((j) =>
      j.id === job.id ? { ...j, status, actualCost: payload?.actualCost ?? j.actualCost } : j
    )
    setJobs(sortJobs(optimistic))
    try {
      const res = await fetch(`/api/maintenance/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          actualCost: payload?.actualCost,
          chargeToOwner: payload?.chargeToOwner,
          ownerStatementNote: payload?.ownerStatementNote,
        }),
      })
      const data = (await res.json()) as {
        job?: MaintenanceJobDto
        error?: string
        expenseMonth?: number
        expenseYear?: number
      }
      if (!res.ok || !data.job) {
        setJobs(prevJobs)
        toast.error(data.error ?? "Failed to update job.")
        return
      }
      setJobs((cur) => sortJobs(cur.map((j) => (j.id === job.id ? data.job! : j))))
      setDrawerJob((cur) => (cur && cur.id === data.job!.id ? data.job! : cur))
      if (status === "completed") {
        if (data.expenseMonth && data.expenseYear) {
          setExpenseMonth(data.expenseMonth)
          setExpenseYear(data.expenseYear)
          const monthLabel = new Date(
            data.expenseYear,
            data.expenseMonth - 1,
            1
          ).toLocaleDateString("en-ZA", { month: "long" })
          toast.success(
            `Job completed — expense added to ${monthLabel} owner statement`
          )
        } else {
          toast.success("Job marked as completed.")
        }
      } else {
        toast.success("Job updated.")
      }
    } catch {
      setJobs(prevJobs)
      toast.error("Failed to update job.")
    } finally {
      setStatusSaving(false)
    }
  }

  const onJobSaved = (job: MaintenanceJobDto) => {
    setJobs((cur) => {
      const existing = cur.find((j) => j.id === job.id)
      if (existing) {
        return sortJobs(cur.map((j) => (j.id === job.id ? job : j)))
      }
      return sortJobs([...cur, job])
    })
  }

  const onDeleteOrCancel = async (job: MaintenanceJobDto) => {
    const prev = jobs
    const optimistic: MaintenanceJobDto[] = jobs.map((j) =>
      j.id === job.id ? { ...j, status: "cancelled" } : j
    )
    setJobs(optimistic)
    try {
      const res = await fetch(`/api/maintenance/${job.id}`, {
        method: "DELETE",
      })
      const data = (await res.json()) as {
        deleted?: boolean
        softDeleted?: boolean
        error?: string
      }
      if (!res.ok) {
        setJobs(prev)
        toast.error(data.error ?? "Failed to delete job.")
        return
      }
      if (data.deleted) {
        setJobs((cur) => cur.filter((j) => j.id !== job.id))
      } else if (data.softDeleted) {
        setJobs((cur) =>
          cur.map((j) => (j.id === job.id ? { ...j, status: "cancelled" } : j))
        )
      }
      toast.success("Job cancelled.")
    } catch {
      setJobs(prev)
      toast.error("Failed to delete job.")
    }
  }

  const onFilterFromStats = (status?: string, priority?: string) => {
    setFilters((cur) => ({
      ...cur,
      status: status ?? "",
      priority: priority ?? "",
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight spike-heading">
            Maintenance
          </h1>
          <p className="mt-1 text-sm spike-text-muted">
            Track and manage property jobs and repairs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={view === "list" ? "default" : "outline"}
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => setView("list")}
          >
            <LayoutList className="size-4" />
          </Button>
          <Button
            type="button"
            variant={view === "board" ? "default" : "outline"}
            size="icon-sm"
            className="hidden sm:inline-flex"
            onClick={() => setView("board")}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            className="bg-[var(--spike-primary)] text-white hover:bg-[var(--spike-primary-strong)]"
            onClick={() => {
              setFormJob(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-1.5 size-4" />
            New job
          </Button>
        </div>
      </div>

      <Card className="border-0 bg-[rgba(255,255,255,0.02)] p-4">
        {loading && !jobs.length ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton
                key={idx}
                className="h-9 w-40 rounded-full bg-[rgba(255,255,255,0.06)]"
              />
            ))}
          </div>
        ) : (
          <MaintenanceStats
            stats={currentStats}
            activeStatus={filters.status}
            activePriority={filters.priority}
            onFilter={onFilterFromStats}
          />
        )}
      </Card>

      <div className="space-y-4">
        <MaintenanceFilters
          filters={filters}
          properties={properties}
          onChange={(next) => setFilters((cur) => ({ ...cur, ...next }))}
          onClear={() =>
            setFilters({
              search: "",
              propertyId: "",
              status: "",
              priority: "",
              category: "",
            })
          }
        />

        {loading && !jobs.length ? (
          <Card className="spike-card p-0">
            <Table>
              <TableHeader>
                <TableRow className="spike-table-head border-[var(--spike-glass-border)] hover:bg-transparent">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <TableHead key={idx}>
                      <Skeleton className="h-4 w-20 bg-[rgba(255,255,255,0.06)]" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-[var(--spike-glass-border)]">
                    {Array.from({ length: 8 }).map((__, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-3">
                        <Skeleton className="h-4 w-full bg-[rgba(255,255,255,0.04)]" />
                      </td>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="spike-card p-6 text-sm spike-text-muted">
            No maintenance jobs found. Try adjusting your filters or create a new job.
          </Card>
        ) : view === "list" ? (
          <Card className="spike-card p-0">
            <Table>
              <TableHeader>
                <TableRow className="spike-table-head border-[var(--spike-glass-border)] hover:bg-transparent">
                  <TableHead>Priority</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onOpen={(j) => {
                      setDrawerJob(j)
                      setDrawerOpen(true)
                    }}
                    onEdit={(j) => {
                      setFormJob(j)
                      setFormOpen(true)
                    }}
                    onStatusChange={(j, status) =>
                      status === "cancelled"
                        ? void onDeleteOrCancel(j)
                        : void onStatusChange(j, status as MaintenanceJobDto["status"])
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {(["open", "in_progress", "completed", "cancelled"] as const).map(
              (status: MaintenanceJobDto["status"]) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide spike-text-secondary">
                      {status === "open"
                        ? "Open"
                        : status === "in_progress"
                          ? "In Progress"
                          : status === "completed"
                            ? "Completed"
                            : "Cancelled"}
                    </h3>
                    <span className="rounded-full bg-[rgba(148,163,184,0.15)] px-2 py-0.5 text-[11px] tabular-nums spike-text-muted">
                      {boardColumns[status].length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {boardColumns[status].map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onOpen={(j) => {
                          setDrawerJob(j)
                          setDrawerOpen(true)
                        }}
                        onEdit={(j) => {
                          setFormJob(j)
                          setFormOpen(true)
                        }}
                        onStatusChange={(j, nextStatus) =>
                          nextStatus === "cancelled"
                            ? void onDeleteOrCancel(j)
                            : void onStatusChange(j, nextStatus as MaintenanceJobDto["status"])
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <JobDrawer
        open={drawerOpen}
        job={drawerJob}
        saving={statusSaving}
        expenseMonth={expenseMonth}
        expenseYear={expenseYear}
        onOpenChange={setDrawerOpen}
        onStatusChange={(job, status, payload) =>
          void onStatusChange(job, status as MaintenanceJobDto["status"], payload)
        }
      />

      <JobForm
        open={formOpen}
        onOpenChange={setFormOpen}
        job={formJob}
        properties={properties}
        contractors={contractors}
        onSaved={onJobSaved}
        onContractorCreated={(c) => setContractors((cur) => [...cur, c])}
      />
    </div>
  )
}

function sortJobs(jobs: MaintenanceJobDto[]): MaintenanceJobDto[] {
  const order = PRIORITY_ORDER
  return [...jobs].sort((a, b) => {
    const pa = order[a.priority] ?? 2
    const pb = order[b.priority] ?? 2
    if (pa !== pb) return pa - pb
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  })
}

