"use client"

import { useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, subMonths } from "date-fns"
import { ReportsPeriodBar } from "@/components/reports/reports-period-bar"
import { ReportsPropertiesFullTable } from "@/components/reports/reports-properties-full-table"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"
import { useReportsSummary } from "@/components/reports/use-reports-summary"
import { Button } from "@/components/ui/button"
import type { ReportsPeriodKind } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

export function ReportsPropertiesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const now = useMemo(() => new Date(), [])

  const periodKind = (searchParams.get("period") ?? "month") as ReportsPeriodKind
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1)
  const year = Number(searchParams.get("year") ?? now.getFullYear())
  const from = searchParams.get("from") ?? format(subMonths(now, 4), "yyyy-MM-dd")
  const to = searchParams.get("to") ?? format(now, "yyyy-MM-dd")

  const { data, error, showSkeleton, contentBusy, fetchSummary } = useReportsSummary({
    periodKind,
    month,
    year,
    from,
    to,
  })

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const q = next.toString()
      router.push(q ? `/reports/properties?${q}` : "/reports/properties")
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

  return (
    <div className="space-y-6">
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
            "transition-opacity",
            contentBusy && "pointer-events-none opacity-60"
          )}
        >
          <ReportsPropertiesFullTable data={data} />
        </div>
      ) : null}
    </div>
  )
}
