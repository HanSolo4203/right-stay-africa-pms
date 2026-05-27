"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import type { PortfolioMonthOffset } from "@/lib/portfolio-month-analytics"

type DashboardPortfolioMonthFiltersProps = {
  activeOffset: PortfolioMonthOffset
}

export function DashboardPortfolioMonthFilters({ activeOffset }: DashboardPortfolioMonthFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const push = useCallback(
    (offset: PortfolioMonthOffset) => {
      const next = new URLSearchParams(searchParams.toString())
      if (offset === 0) {
        next.delete("portfolio_month")
      } else if (offset === -1) {
        next.set("portfolio_month", "prev")
      } else {
        next.set("portfolio_month", "next")
      }
      const q = next.toString()
      startTransition(() => {
        router.push(q ? `/dashboard?${q}` : "/dashboard")
      })
    },
    [router, searchParams]
  )

  const tabs: { offset: PortfolioMonthOffset; label: string }[] = [
    { offset: -1, label: "Previous month" },
    { offset: 0, label: "This month" },
    { offset: 1, label: "Next month" },
  ]

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <span className="text-xs font-medium spike-text-muted">Calendar month</span>
      <div
        className="spike-segment-group w-full sm:w-auto"
        role="tablist"
        aria-label="Portfolio calendar month"
      >
        {tabs.map(({ offset, label }) => (
          <button
            key={offset}
            type="button"
            role="tab"
            aria-selected={activeOffset === offset}
            data-active={activeOffset === offset}
            disabled={pending}
            onClick={() => push(offset)}
            className="spike-segment-btn"
          >
            {label}
          </button>
        ))}
      </div>
      {pending ? <span className="text-xs spike-text-muted">Updating…</span> : null}
    </div>
  )
}
