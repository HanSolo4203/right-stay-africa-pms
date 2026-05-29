"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SprayCan,
} from "lucide-react"
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isToday,
  isTomorrow,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { CleaningTaskRow, type CleaningStatus, type CleaningTaskRowTask } from "@/components/cleaning/CleaningTaskRow"
import { CleaningTaskDrawer } from "@/components/cleaning/CleaningTaskDrawer"
import { NoteDialog } from "@/components/cleaning/NoteDialog"
import { CleaningSkeleton } from "@/components/cleaning/CleaningSkeleton"
import { ManualCleaningDialog } from "@/components/cleaning/ManualCleaningDialog"
import { formatCleaningPropertyLabel } from "@/lib/cleaning/format-property-label"
import {
  cleaningTypeBadgeClass,
  cleaningTypeEmoji,
} from "@/lib/cleaning/type-styles"
import { toast } from "@/components/ui/toast"

type CleaningStats = {
  overdue: number
  todayCount: number
  next7Count: number
  completedThisWeek: number
}

type CleaningTask = CleaningTaskRowTask & {
  completedAt?: string | Date | null
}

export default function CleaningPage() {
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [stats, setStats] = useState<CleaningStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [view, setView] = useState<"list" | "calendar" | "month">(
    () =>
      typeof window !== "undefined"
        ? ((window.localStorage.getItem("cleaning_view") as
            | "list"
            | "calendar"
            | "month"
            | null) ?? "list")
        : "list",
  )
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [manualDialogScheduledDate, setManualDialogScheduledDate] = useState<string>(
    () => format(new Date(), "yyyy-MM-dd"),
  )

  function openManualCleanDialog(scheduledDate: Date) {
    setManualDialogScheduledDate(format(scheduledDate, "yyyy-MM-dd"))
    setManualDialogOpen(true)
  }

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filterProperty, setFilterProperty] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"))

  // Week view state
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )

  // Month grid state
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()))

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  useEffect(() => {
    void fetchTasks()
  }, [dateFrom, dateTo])

  useEffect(() => {
    void fetchStats()
  }, [tasks])

  async function fetchTasks() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/cleaning?from=${dateFrom}&to=${dateTo}`)
      if (!res.ok) {
        toast.error("Failed to load cleaning tasks.")
        setTasks([])
        return
      }
      const data = (await res.json()) as { tasks?: CleaningTask[] }
      setTasks(data.tasks ?? [])
    } catch {
      toast.error("Failed to load cleaning tasks.")
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/cleaning/stats")
      if (!res.ok) return
      const data = (await res.json()) as CleaningStats
      setStats(data)
    } catch {
      // ignore, lightweight stats
    }
  }

  async function generateTasks() {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/cleaning/generate", { method: "POST" })
      const data = (await res.json().catch(() => ({}))) as {
        created?: number
        bookingsProcessed?: number
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate cleaning tasks.")
        return
      }
      const created = data.created ?? 0
      toast.success(
        created === 0
          ? "No new cleaning tasks created."
          : `Generated ${created} cleaning task${created === 1 ? "" : "s"}.`,
      )
      await fetchTasks()
    } catch {
      toast.error("Failed to generate cleaning tasks.")
    } finally {
      setIsGenerating(false)
    }
  }

  async function updateTaskStatus(
    id: string,
    status: CleaningStatus,
    notes?: string,
  ) {
    // optimistic
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              completedAt:
                status === "completed" ? new Date().toISOString() : null,
              ...(notes !== undefined ? { notes } : {}),
            }
          : t,
      ),
    )
    if (selectedTask?.id === id) {
      setSelectedTask((prev) =>
        prev ? { ...prev, status, ...(notes !== undefined ? { notes } : {}) } : null,
      )
    }

    try {
      const res = await fetch(`/api/cleaning/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      })
      if (!res.ok) {
        toast.error("Failed to update cleaning task.")
        await fetchTasks()
      }
    } catch {
      toast.error("Failed to update cleaning task.")
      await fetchTasks()
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const scheduledDate = new Date(task.scheduledDate)
      const propertyLabel = formatCleaningPropertyLabel(
        task.property.name,
        task.property.unitNumber,
      )
      const matchesSearch =
        !searchTerm ||
        propertyLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.property.unitNumber ?? "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (task.booking?.guestName ?? "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false
      if (filterProperty && task.propertyId !== filterProperty) return false
      if (filterType && task.type !== (filterType as CleaningTask["type"])) return false
      if (filterStatus && task.status !== (filterStatus as CleaningStatus)) return false

      if (activeFilter === "overdue") {
        if (!(isPast(scheduledDate) && !isToday(scheduledDate) && task.status === "scheduled")) {
          return false
        }
      }
      if (activeFilter === "today") {
        if (!isToday(scheduledDate)) return false
      }

      return true
    })
  }, [tasks, searchTerm, filterProperty, filterType, filterStatus, activeFilter])

  const groupedTasks = useMemo(() => {
    const groups: Record<string, CleaningTask[]> = {}
    for (const task of filteredTasks) {
      const key = format(new Date(task.scheduledDate), "yyyy-MM-dd")
      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    }
    return groups
  }, [filteredTasks])

  const properties = useMemo(() => {
    const map = new Map<string, { name: string; unitNumber: string | null }>()
    tasks.forEach((t) => {
      map.set(t.propertyId, {
        name: t.property.name,
        unitNumber: t.property.unitNumber,
      })
    })
    return Array.from(map.entries()).map(([id, p]) => ({ id, ...p }))
  }, [tasks])

  const propertiesThisWeek = useMemo(() => {
    const map = new Map<string, { id: string; name: string; unitNumber?: string | null }>()
    filteredTasks
      .filter((t) => {
        const d = new Date(t.scheduledDate)
        return d >= weekStart && d <= addDays(weekStart, 6)
      })
      .forEach((t) => {
        map.set(t.propertyId, {
          id: t.propertyId,
          name: t.property.name,
          unitNumber: t.property.unitNumber,
        })
      })
    return Array.from(map.values())
  }, [filteredTasks, weekStart])

  const tasksByDayKey = useMemo(() => {
    const map = new Map<string, CleaningTask[]>()
    for (const task of filteredTasks) {
      const key = format(new Date(task.scheduledDate), "yyyy-MM-dd")
      const list = map.get(key)
      if (list) list.push(task)
      else map.set(key, [task])
    }
    return map
  }, [filteredTasks])

  const monthGridDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 })
    const days: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) {
      days.push(d)
      // guard against infinite loops
      if (days.length > 42) break
    }
    return days
  }, [monthStart])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cleaning Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Checkout and mid-stay cleans across all properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openManualCleanDialog(new Date())}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add manual clean
          </button>
          <button
            type="button"
            onClick={() => {
              void generateTasks()
            }}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Generate tasks
          </button>
        </div>
      </div>

      {/* Stats chips */}
      <div className="flex items-center gap-3 flex-wrap mb-1">
        {[
          {
            key: "overdue",
            label: "Overdue",
            count: stats?.overdue ?? 0,
            color: "bg-red-100 text-red-700 border-red-200",
          },
          {
            key: "today",
            label: "Today",
            count: stats?.todayCount ?? 0,
            color: "bg-amber-100 text-amber-700 border-amber-200",
          },
          {
            key: "next7",
            label: "Next 7 days",
            count: stats?.next7Count ?? 0,
            color: "bg-blue-100 text-blue-700 border-blue-200",
          },
          {
            key: "done",
            label: "Done this week",
            count: stats?.completedThisWeek ?? 0,
            color: "bg-green-100 text-green-700 border-green-200",
          },
        ].map((chip) => (
          <button
            type="button"
            key={chip.key}
            onClick={() =>
              setActiveFilter((current) => (current === chip.key ? null : chip.key))
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${chip.color} ${
              activeFilter === chip.key
                ? "ring-2 ring-offset-1 ring-current"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <span className="text-base font-bold">{chip.count}</span>
            {chip.label}
          </button>
        ))}
        {activeFilter && (
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search property or guest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Property filter */}
        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {formatCleaningPropertyLabel(p.name, p.unitNumber)}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="">All types</option>
          <option value="checkout">Checkout</option>
          <option value="midstay">Mid-stay</option>
          <option value="manual">Manual</option>
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="skipped">Skipped</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => {
              setView("list")
              if (typeof window !== "undefined") {
                window.localStorage.setItem("cleaning_view", "list")
              }
            }}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 ${
              view === "list"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            type="button"
            onClick={() => {
              setView("calendar")
              if (typeof window !== "undefined") {
                window.localStorage.setItem("cleaning_view", "calendar")
              }
            }}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 ${
              view === "calendar"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Week
          </button>
          <button
            type="button"
            onClick={() => {
              setView("month")
              if (typeof window !== "undefined") {
                window.localStorage.setItem("cleaning_view", "month")
              }
            }}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 ${
              view === "month"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Calendar className="w-4 h-4" /> Month
          </button>
        </div>
      </div>

      {/* Main content */}
      {isLoading ? (
        <CleaningSkeleton />
      ) : tasks.length === 0 && filteredTasks.length === 0 ? (
        <div className="text-center py-16 px-4">
          <SprayCan className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-500 font-semibold text-base">
            No cleaning tasks found
          </h3>
          <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
            Click &quot;Generate tasks&quot; to create cleaning tasks from your existing
            bookings.
          </p>
          <button
            type="button"
            onClick={() => {
              void generateTasks()
            }}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Generate tasks
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 px-4">
          <SprayCan className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-500 font-semibold text-base">
            No cleaning tasks found
          </h3>
          <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
            No tasks match your current filters.
          </p>
        </div>
      ) : view === "list" ? (
        <div>
          {Object.keys(groupedTasks)
            .sort()
            .map((dateKey) => {
              const date = new Date(dateKey)
              const dayTasks = groupedTasks[dateKey]
              const isOverdueDate = isPast(date) && !isToday(date)

              return (
                <div key={dateKey} className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-lg font-bold tracking-tight spike-heading ${
                          isToday(date)
                            ? "text-[var(--spike-accent-orange)]"
                            : isTomorrow(date)
                              ? "text-[var(--spike-primary)]"
                              : ""
                        } ${isOverdueDate ? "opacity-90" : ""}`}
                      >
                        {isToday(date)
                          ? "Today"
                          : isTomorrow(date)
                            ? "Tomorrow"
                            : format(date, "EEEE, d MMMM yyyy")}
                      </span>
                      <span className="text-sm font-medium spike-text-muted">
                        {dayTasks.length}{" "}
                        {dayTasks.length === 1 ? "clean" : "cleans"}
                      </span>
                    </div>
                    {isOverdueDate &&
                      dayTasks.some((t) => t.status === "scheduled") && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium border border-red-200">
                          Overdue
                        </span>
                      )}
                  </div>

                  <div className="space-y-2">
                    {dayTasks.map((task) => (
                      <CleaningTaskRow
                        key={task.id}
                        task={task}
                        isOverdue={
                          isOverdueDate && task.status === "scheduled"
                        }
                        onMarkDone={() =>
                          void updateTaskStatus(task.id, "completed")
                        }
                        onSkip={() =>
                          void updateTaskStatus(task.id, "skipped")
                        }
                        onReopen={() =>
                          void updateTaskStatus(task.id, "scheduled")
                        }
                        onAddNote={() => {
                          setSelectedTask(task)
                          setNoteText(task.notes ?? "")
                          setNoteDialogOpen(true)
                        }}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      ) : view === "calendar" ? (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="font-semibold text-gray-900">
                {format(weekStart, "d MMM")} –{" "}
                {format(addDays(weekStart, 6), "d MMM yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
                }
                className="text-sm px-3 py-1 border rounded-md hover:bg-gray-50"
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => setWeekStart((w) => addDays(w, 7))}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div
            className="border border-gray-200 rounded-xl overflow-hidden"
            style={{
              display: "grid",
              gridTemplateColumns: "160px repeat(7, 1fr)",
            }}
          >
            <div className="bg-gray-50 p-3 border-b border-r border-gray-200" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`bg-gray-50 p-3 text-center border-b border-r border-gray-200 last:border-r-0 ${
                  isToday(day) ? "bg-amber-50" : ""
                }`}
              >
                <div
                  className={`text-xs font-medium ${
                    isToday(day) ? "text-amber-600" : "text-gray-400"
                  }`}
                >
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    isToday(day) ? "text-amber-600" : "text-gray-800"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}

            {/* Property rows */}
            {propertiesThisWeek.length === 0 ? (
              <>
                <div className="bg-white border-b border-r border-gray-100 p-3" />
                {weekDays.map((d) => (
                  <div
                    key={d.toISOString()}
                    className="bg-white border-b border-r border-gray-100 last:border-r-0"
                  />
                ))}
              </>
            ) : (
              propertiesThisWeek.map((property) => (
                <React.Fragment key={property.id}>
                  <div className="p-3 border-b border-r border-gray-100 bg-white flex flex-col justify-center min-h-[64px]">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {formatCleaningPropertyLabel(property.name, property.unitNumber)}
                    </span>
                  </div>
                  {weekDays.map((day) => {
                    const dayTasks = filteredTasks.filter(
                      (t) =>
                        t.propertyId === property.id &&
                        isSameDay(new Date(t.scheduledDate), day),
                    )
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-1.5 border-b border-r border-gray-100 last:border-r-0 min-h-[64px] ${
                          isToday(day) ? "bg-amber-50/30" : "bg-white"
                        }`}
                      >
                        {dayTasks.map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => setSelectedTask(task)}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold mb-1 last:mb-0 border transition-opacity hover:opacity-80 focus:outline-none ${cleaningTypeBadgeClass(task.type)} ${
                              task.status === "completed"
                                ? "opacity-40 line-through"
                                : ""
                            } ${
                              task.status === "skipped" ? "opacity-40" : ""
                            }`}
                            title={`${task.type} clean — ${task.booking?.guestName ?? "Manual"} — ${formatCleaningPropertyLabel(task.property.name, task.property.unitNumber)}`}
                          >
                            {cleaningTypeEmoji(task.type)}{" "}
                            <span className="truncate block">
                              {task.booking?.guestName?.split(" ")[0] ?? "Manual"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))
            )}
          </div>
          {propertiesThisWeek.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No cleaning tasks this week
            </div>
          )}
        </>
      ) : (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() =>
                setMonthStart((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1))
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="font-semibold text-gray-900">
                {format(monthStart, "MMMM yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthStart(startOfMonth(new Date()))}
                className="text-sm px-3 py-1 border rounded-md hover:bg-gray-50"
              >
                This month
              </button>
              <button
                type="button"
                onClick={() =>
                  setMonthStart((cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1))
                }
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-2">
            Click a date to add a cleaning task. Click an existing task to view details.
          </p>

          {/* Month grid */}
          <div className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  className="min-w-0 px-2 py-3 text-center text-xs font-medium text-gray-500 sm:px-3"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
              {monthGridDays.map((day) => {
                const inMonth = day.getMonth() === monthStart.getMonth()
                const dayKey = format(day, "yyyy-MM-dd")
                const dayTasks = tasksByDayKey.get(dayKey) ?? []
                const overflow = dayTasks.length > 3 ? dayTasks.length - 3 : 0
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => openManualCleanDialog(day)}
                    title={`Add cleaning on ${format(day, "EEEE, d MMMM yyyy")}`}
                    className={`group min-h-[120px] min-w-0 p-1.5 text-left transition-colors sm:p-2 ${
                      isToday(day)
                        ? "bg-amber-50/40 hover:bg-amber-50/70"
                        : "bg-white hover:bg-gray-50"
                    } ${!inMonth ? "opacity-60" : ""}`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-1">
                      <span
                        className={`shrink-0 text-xs font-semibold sm:text-sm ${
                          inMonth ? "text-gray-900" : "text-gray-300"
                        } ${isToday(day) ? "text-amber-700" : ""} group-hover:text-gray-900`}
                      >
                        {format(day, "d")}
                      </span>
                      {dayTasks.some((t) => t.status === "scheduled") &&
                      isPast(day) &&
                      !isToday(day) ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          Overdue
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1.5 min-w-0 space-y-1 sm:mt-2">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTask(task)
                          }}
                          className={`w-full min-w-0 overflow-hidden text-left px-1.5 py-1 rounded-md text-[10px] font-semibold border transition-opacity hover:opacity-80 focus:outline-none sm:px-2 sm:py-1.5 sm:text-xs ${cleaningTypeBadgeClass(task.type)} ${
                            task.status === "completed"
                              ? "opacity-40 line-through"
                              : task.status === "skipped"
                                ? "opacity-40"
                                : ""
                          }`}
                          title={`${task.type} clean — ${formatCleaningPropertyLabel(task.property.name, task.property.unitNumber)} — ${task.booking?.guestName ?? "Manual"}`}
                        >
                          <span className="block truncate">
                            {cleaningTypeEmoji(task.type)}{" "}
                            {formatCleaningPropertyLabel(
                              task.property.name,
                              task.property.unitNumber,
                            )}
                          </span>
                        </button>
                      ))}
                      {overflow > 0 ? (
                        <button
                          type="button"
                          className="w-full text-left text-[11px] text-gray-400 hover:text-gray-600 underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSearchTerm("")
                            setFilterProperty("")
                            setFilterType("")
                            setFilterStatus("")
                            setActiveFilter(null)
                            setView("list")
                            if (typeof window !== "undefined") {
                              window.localStorage.setItem("cleaning_view", "list")
                            }
                          }}
                        >
                          +{overflow} more
                        </button>
                      ) : (
                        <span className="pointer-events-none block pt-1 text-[10px] text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 sm:text-[11px]">
                          + Add clean
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Drawer */}
      <CleaningTaskDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null)
        }}
        onUpdateStatus={updateTaskStatus}
        onOpenNote={() => {
          if (!selectedTask) return
          setNoteText(selectedTask.notes ?? "")
          setNoteDialogOpen(true)
        }}
      />

      {/* Note dialog */}
      <NoteDialog
        open={noteDialogOpen}
        noteText={noteText}
        onNoteTextChange={setNoteText}
        onOpenChange={setNoteDialogOpen}
        onSave={async () => {
          if (!selectedTask) return
          await updateTaskStatus(selectedTask.id, selectedTask.status, noteText)
        }}
      />

      <ManualCleaningDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        defaultPropertyId={filterProperty}
        defaultScheduledDate={manualDialogScheduledDate}
        onCreated={() => {
          void fetchTasks()
          void fetchStats()
        }}
      />
    </div>
  )
}

