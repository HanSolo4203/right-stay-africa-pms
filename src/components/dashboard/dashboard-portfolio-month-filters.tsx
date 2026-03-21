"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { cn } from "@/lib/utils"
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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-600">Calendar month</span>
      <div
        className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200/80 bg-white/80 p-1 shadow-sm"
        role="tablist"
        aria-label="Portfolio calendar month"
      >
        {tabs.map(({ offset, label }) => (
          <button
            key={offset}
            type="button"
            role="tab"
            aria-selected={activeOffset === offset}
            disabled={pending}
            onClick={() => push(offset)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeOffset === offset
                ? "bg-green-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {pending ? <span className="text-xs text-slate-500">Updating…</span> : null}
    </div>
  )
}
