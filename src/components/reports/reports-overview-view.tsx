"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, subMonths } from "date-fns"
import { Download, FileText, RefreshCw } from "lucide-react"
import { ReportsBusinessKpis } from "@/components/reports/reports-business-kpis"
import { ReportsFeeDonut } from "@/components/reports/reports-fee-donut"
import { ReportsInsightsPanel } from "@/components/reports/reports-insights-panel"
import { ReportsPeriodBar } from "@/components/reports/reports-period-bar"
import { ReportsPlatformSection } from "@/components/reports/reports-platform-section"
import { ReportsPropertyTable } from "@/components/reports/reports-property-table"
import { ReportsRevenueTrend } from "@/components/reports/reports-revenue-trend"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"
import { useReportsSummary } from "@/components/reports/use-reports-summary"
import { Button } from "@/components/ui/button"
import { formatLastUpdated } from "@/lib/dashboard/dashboard-ui"
import { exportReportsToCsv } from "@/lib/reports/export-csv"
import type { ReportsPeriodKind } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

export function ReportsOverviewView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const now = useMemo(() => new Date(), [])

  const periodKind = (searchParams.get("period") ?? "month") as ReportsPeriodKind
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1)
  const year = Number(searchParams.get("year") ?? now.getFullYear())
  const from = searchParams.get("from") ?? format(subMonths(now, 4), "yyyy-MM-dd")
  const to = searchParams.get("to") ?? format(now, "yyyy-MM-dd")

  const { data, error, showSkeleton, contentBusy, refreshing, fetchSummary, lastUpdatedAt } =
    useReportsSummary({ periodKind, month, year, from, to })

  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("Not updated yet")

  useEffect(() => {
    const tick = () => setLastUpdatedLabel(formatLastUpdated(lastUpdatedAt))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [lastUpdatedAt])

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const q = next.toString()
      router.push(q ? `/reports?${q}` : "/reports")
    },
    [router]
  )

  const updateSearch = useCallback(
    (patch: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      patch(next)
      pushParams(next)
    },
    [pushParams, searchParams]
  )

  const handleExportCsv = () => {
    if (data) exportReportsToCsv(data)
  }

  const handleExportPdf = async () => {
    if (!data) return
    setExportingPdf(true)
    try {
      const res = await fetch("/api/reports/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryData: data }),
      })
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string }
        throw new Error(payload.error ?? "PDF export failed.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rsa-report-${data.period.label.replace(/\s/g, "-")}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "PDF export failed.")
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs spike-text-muted">{lastUpdatedLabel}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={contentBusy}
          onClick={() => void fetchSummary({ isRefresh: true, hadData: true })}
          className="border-[var(--spike-glass-border)] bg-transparent"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!data || contentBusy}
          onClick={handleExportCsv}
          className="border-[var(--spike-glass-border)] bg-transparent"
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!data || contentBusy || exportingPdf}
          onClick={() => void handleExportPdf()}
          className="border-[var(--spike-glass-border)] bg-transparent"
        >
          <FileText className={cn("size-3.5", exportingPdf && "animate-pulse")} />
          Export PDF
        </Button>
      </div>

      <ReportsPeriodBar
        periodKind={periodKind}
        month={month}
        year={year}
        from={from}
        to={to}
        onPeriodKindChange={(kind) => {
          updateSearch((next) => {
            next.set("period", kind)
            if (kind === "month") {
              next.set("month", String(month))
              next.set("year", String(year))
              next.delete("from")
              next.delete("to")
            } else if (kind === "year") {
              next.set("year", String(year))
              next.delete("month")
              next.delete("from")
              next.delete("to")
            } else {
              next.set("from", from)
              next.set("to", to)
              next.delete("month")
            }
          })
        }}
        onMonthChange={(m) => {
          updateSearch((next) => {
            next.set("period", "month")
            next.set("month", String(m))
            next.set("year", String(year))
          })
        }}
        onYearChange={(y) => {
          updateSearch((next) => {
            next.set("period", periodKind === "year" ? "year" : "month")
            next.set("year", String(y))
            if (periodKind === "month") next.set("month", String(month))
          })
        }}
        onFromChange={(value) => {
          updateSearch((next) => {
            next.set("period", "custom")
            next.set("from", value)
            next.set("to", to)
            next.delete("month")
          })
        }}
        onToChange={(value) => {
          updateSearch((next) => {
            next.set("period", "custom")
            next.set("from", from)
            next.set("to", value)
            next.delete("month")
          })
        }}
      />

      {exportError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {exportError}
        </p>
      ) : null}

      {error && !data ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void fetchSummary({ hadData: false })}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {showSkeleton ? (
        <ReportsContentSkeleton />
      ) : data ? (
        <div
          className={cn(
            "space-y-6 transition-opacity",
            contentBusy && "pointer-events-none opacity-60"
          )}
          aria-busy={contentBusy}
        >
          <ReportsBusinessKpis data={data} />
          <ReportsRevenueTrend data={data} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ReportsPlatformSection data={data} />
            </div>
            <div className="lg:col-span-5">
              <ReportsFeeDonut data={data} />
            </div>
          </div>
          <ReportsPropertyTable data={data} />
          <ReportsInsightsPanel data={data} />
        </div>
      ) : null}
    </div>
  )
}
