"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_LABELS } from "@/lib/maintenance/constants"
import { MAINTENANCE_JOB_CATEGORIES } from "@/lib/validations/maintenance"
import type { PropertyOption } from "@/types/maintenance"

export type MaintenanceFilterState = {
  search: string
  propertyId: string
  status: string
  priority: string
  category: string
}

type MaintenanceFiltersProps = {
  filters: MaintenanceFilterState
  properties: PropertyOption[]
  hidePropertyFilter?: boolean
  onChange: (next: Partial<MaintenanceFilterState>) => void
  onClear: () => void
}

export function MaintenanceFilters({
  filters,
  properties,
  hidePropertyFilter,
  onChange,
  onClear,
}: MaintenanceFiltersProps) {
  const hasActive =
    filters.search ||
    filters.propertyId ||
    filters.status ||
    filters.priority ||
    filters.category

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 spike-text-muted" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search jobs…"
          className="border-[var(--spike-glass-border)] bg-transparent pl-9"
        />
      </div>

      {!hidePropertyFilter ? (
        <Select
          value={filters.propertyId || "all"}
          onValueChange={(v) => onChange({ propertyId: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-[180px] border-[var(--spike-glass-border)] bg-transparent">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.unitNumber ? ` · ${p.unitNumber}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={filters.status || "all"}
        onValueChange={(v) => onChange({ status: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[150px] border-[var(--spike-glass-border)] bg-transparent">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.priority || "all"}
        onValueChange={(v) => onChange({ priority: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[140px] border-[var(--spike-glass-border)] bg-transparent">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.category || "all"}
        onValueChange={(v) => onChange({ category: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[170px] border-[var(--spike-glass-border)] bg-transparent">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {MAINTENANCE_JOB_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs text-[var(--spike-primary)] hover:underline"
        >
          <X className="size-3" />
          Clear filters
        </button>
      ) : null}
    </div>
  )
}

export function filterMaintenanceJobs<
  T extends {
    title: string
    description: string | null
    propertyId: string
    status: string
    priority: string
    category: string
  },
>(jobs: T[], filters: MaintenanceFilterState): T[] {
  const q = filters.search.trim().toLowerCase()
  return jobs.filter((job) => {
    if (filters.propertyId && job.propertyId !== filters.propertyId) return false
    if (filters.status && job.status !== filters.status) return false
    if (filters.priority && job.priority !== filters.priority) return false
    if (filters.category && job.category !== filters.category) return false
    if (q) {
      const hay = `${job.title} ${job.description ?? ""}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
