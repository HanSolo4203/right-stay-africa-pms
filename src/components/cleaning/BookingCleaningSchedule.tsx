"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Loader2, Plus, RefreshCw, SprayCan, Trash2 } from "lucide-react"
import type { CleaningStatus, CleaningType } from "@/lib/cleaning/serialize"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

type ScheduleTask = {
  id?: string
  type: CleaningType
  scheduledDate: string
  status: CleaningStatus
  isManualOverride?: boolean
}

type BookingCleaningResponse = {
  booking: {
    id: string
    propertyId: string
    checkIn: string
    checkOut: string
    cleaningScheduleLocked: boolean
    nights: number
  }
  tasks: Array<{
    id: string
    type: CleaningType
    scheduledDate: string
    status: CleaningStatus
    isManualOverride: boolean
    midstayOccurrence: number | null
  }>
}

function toDateInputValue(iso: string | Date) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

type BookingCleaningScheduleProps = {
  bookingId: string
  canEdit?: boolean
  compact?: boolean
}

export function BookingCleaningSchedule({
  bookingId,
  canEdit = true,
  compact = false,
}: BookingCleaningScheduleProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [lockSchedule, setLockSchedule] = useState(false)
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [stayRange, setStayRange] = useState<{ checkIn: string; checkOut: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cleaning`)
      if (!res.ok) {
        setTasks([])
        setStayRange(null)
        return
      }
      const data = (await res.json()) as BookingCleaningResponse
      setLockSchedule(data.booking.cleaningScheduleLocked)
      setStayRange({ checkIn: data.booking.checkIn, checkOut: data.booking.checkOut })
      setTasks(
        data.tasks.map((t) => ({
          id: t.id,
          type: t.type,
          scheduledDate: toDateInputValue(t.scheduledDate),
          status: t.status,
          isManualOverride: t.isManualOverride,
        })),
      )
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!canEdit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cleaning`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasks.map((t) => ({
            id: t.id,
            type: t.type,
            scheduledDate: t.scheduledDate,
            status: t.status,
          })),
          lockSchedule,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save cleaning schedule.")
        return
      }
      toast.success("Cleaning schedule saved.")
      await load()
    } catch {
      toast.error("Failed to save cleaning schedule.")
    } finally {
      setSaving(false)
    }
  }

  const regenerate = async (force = false) => {
    if (!canEdit) return
    setRegenerating(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cleaning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true, force }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; created?: number }
      if (!res.ok) {
        toast.error(data.error ?? "Could not regenerate schedule.")
        return
      }
      toast.success(
        data.created ? `Added ${data.created} clean(s) from rules.` : "Schedule is up to date.",
      )
      await load()
    } catch {
      toast.error("Could not regenerate schedule.")
    } finally {
      setRegenerating(false)
    }
  }

  const addTask = () => {
    const defaultDate = stayRange ? toDateInputValue(stayRange.checkOut) : toDateInputValue(new Date())
    setTasks((prev) => [
      ...prev,
      { type: "midstay", scheduledDate: defaultDate, status: "scheduled" },
    ])
  }

  const updateTask = (index: number, patch: Partial<ScheduleTask>) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  const removeTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        Loading cleans…
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50/80 ${compact ? "p-3" : "p-4"} space-y-3`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SprayCan className="size-4 text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Scheduled cleans</p>
            {stayRange ? (
              <p className="text-xs text-slate-500">
                Stay {format(new Date(stayRange.checkIn), "d MMM")} –{" "}
                {format(new Date(stayRange.checkOut), "d MMM yyyy")}
              </p>
            ) : null}
          </div>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={regenerating || saving || lockSchedule}
              title={
                lockSchedule
                  ? "Unlock the schedule to run auto-fill"
                  : "Apply standard checkout and mid-stay rules"
              }
              onClick={() => void regenerate(false)}
            >
              {regenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              <span className="ml-1">Auto-fill</span>
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={addTask}>
              <Plus className="size-3.5" />
              <span className="ml-1">Add</span>
            </Button>
          </div>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500">
          No cleans scheduled. Use Auto-fill to apply the standard checkout and mid-stay rules.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task, index) => (
            <li
              key={task.id ?? `new-${index}`}
              className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2"
            >
              <select
                value={task.type}
                disabled={!canEdit || saving}
                onChange={(e) =>
                  updateTask(index, { type: e.target.value as CleaningType })
                }
                className="rounded border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="checkout">Checkout</option>
                <option value="midstay">Mid-stay</option>
              </select>
              <input
                type="date"
                value={task.scheduledDate}
                disabled={!canEdit || saving}
                onChange={(e) => updateTask(index, { scheduledDate: e.target.value })}
                className="rounded border border-slate-200 px-2 py-1 text-xs"
              />
              <select
                value={task.status}
                disabled={!canEdit || saving}
                onChange={(e) =>
                  updateTask(index, { status: e.target.value as CleaningStatus })
                }
                className="rounded border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Done</option>
                <option value="skipped">Skipped</option>
              </select>
              {task.isManualOverride ? (
                <span className="text-[10px] font-medium text-amber-700">Edited</span>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className="ml-auto p-1 text-slate-400 hover:text-red-600"
                  onClick={() => removeTask(index)}
                  aria-label="Remove clean"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={lockSchedule}
              onChange={(e) => setLockSchedule(e.target.checked)}
              className="rounded border-slate-300"
            />
            Lock schedule (auto-fill won&apos;t change this booking)
          </label>
          <Button
            type="button"
            size="sm"
            className="bg-green-700 text-white hover:bg-green-800"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save schedule"}
          </Button>
        </div>
      ) : null}

      {!compact ? (
        <p className="text-[11px] text-slate-500">
          Changes are saved per booking and recorded in this property&apos;s monthly cleaning log.
        </p>
      ) : null}
    </div>
  )
}
