"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, subMonths } from "date-fns"
import type { ReportsPeriodKind, ReportsSummaryResponse } from "@/lib/reports/types"

export type UseReportsSummaryOptions = {
  periodKind?: ReportsPeriodKind
  month?: number
  year?: number
  from?: string
  to?: string
}

export function useReportsSummary(opts: UseReportsSummaryOptions = {}) {
  const now = useMemo(() => new Date(), [])
  const periodKind = opts.periodKind ?? "month"
  const month = opts.month ?? now.getMonth() + 1
  const year = opts.year ?? now.getFullYear()
  const from = opts.from ?? format(subMonths(now, 4), "yyyy-MM-dd")
  const to = opts.to ?? format(now, "yyyy-MM-dd")

  const [data, setData] = useState<ReportsSummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const dataRef = useRef<ReportsSummaryResponse | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set("period", periodKind)
    if (periodKind === "month") {
      params.set("month", String(month))
      params.set("year", String(year))
    } else if (periodKind === "year") {
      params.set("year", String(year))
    } else {
      params.set("from", from)
      params.set("to", to)
    }
    return params.toString()
  }, [periodKind, month, year, from, to])

  const fetchSummary = useCallback(
    async (fetchOpts: { isRefresh?: boolean; hadData?: boolean } = {}) => {
      const { isRefresh = false, hadData = false } = fetchOpts
      if (isRefresh || hadData) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/reports/summary?${apiQuery}`, { cache: "no-store" })
        const payload = (await res.json()) as ReportsSummaryResponse & { error?: string }
        if (!res.ok) {
          throw new Error(payload.error ?? "Failed to load reports.")
        }
        setData(payload)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load reports.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiQuery]
  )

  useEffect(() => {
    void fetchSummary({ hadData: dataRef.current != null })
  }, [apiQuery, fetchSummary])

  const showSkeleton = loading && !data
  const contentBusy = refreshing || loading

  return {
    data,
    error,
    loading,
    refreshing,
    showSkeleton,
    contentBusy,
    fetchSummary,
    lastUpdatedAt: data?.generatedAt ?? null,
  }
}
