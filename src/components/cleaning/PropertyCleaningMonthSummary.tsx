"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

type MonthSummaryProps = {
  propertyId: string
  month: number
  year: number
}

type SummaryResponse = {
  summary: {
    taskCount: number
    completedCount: number
    scheduledCount: number
    manualOverrideCount: number
    lastRecordedAt: string | null
  }
}

export function PropertyCleaningMonthSummary({
  propertyId,
  month,
  year,
}: MonthSummaryProps) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryResponse["summary"] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/cleaning?month=${month}&year=${year}`,
      )
      if (!res.ok) {
        setSummary(null)
        return
      }
      const data = (await res.json()) as SummaryResponse
      setSummary(data.summary)
    } finally {
      setLoading(false)
    }
  }, [propertyId, month, year])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="size-3 animate-spin" />
        Loading cleaning log…
      </div>
    )
  }

  if (!summary || summary.taskCount === 0) {
    return (
      <p className="text-xs text-slate-500">
        No cleans recorded this month. Generate tasks from the Cleaning page or edit schedules on
        bookings.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
      <span className="font-medium text-slate-800">Monthly cleaning log</span>
      <span>
        <strong className="text-slate-900">{summary.taskCount}</strong> scheduled
      </span>
      <span>
        <strong className="text-emerald-700">{summary.completedCount}</strong> done
      </span>
      <span>
        <strong className="text-slate-700">{summary.scheduledCount}</strong> pending
      </span>
      {summary.manualOverrideCount > 0 ? (
        <span>
          <strong className="text-amber-700">{summary.manualOverrideCount}</strong> customised
        </span>
      ) : null}
      {summary.lastRecordedAt ? (
        <span className="text-slate-400">
          Updated {format(new Date(summary.lastRecordedAt), "d MMM HH:mm")}
        </span>
      ) : null}
    </div>
  )
}
