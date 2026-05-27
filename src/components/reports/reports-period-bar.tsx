"use client"

import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ClientsMonthToolbar } from "@/components/clients/clients-month-toolbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ReportsPeriodKind } from "@/lib/reports/types"

const PERIOD_TABS: { kind: ReportsPeriodKind; label: string }[] = [
  { kind: "month", label: "Month" },
  { kind: "year", label: "Year" },
  { kind: "custom", label: "Custom range" },
]

export type ReportsPeriodBarProps = {
  periodKind: ReportsPeriodKind
  month: number
  year: number
  from: string
  to: string
  onPeriodKindChange: (kind: ReportsPeriodKind) => void
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onFromChange: (from: string) => void
  onToChange: (to: string) => void
}

function PeriodDivider() {
  return (
    <div
      className="hidden h-8 w-px shrink-0 bg-[var(--spike-glass-border)] sm:block"
      aria-hidden
    />
  )
}

function NavIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--spike-glass-border)] text-[var(--spike-primary)] transition hover:bg-[var(--spike-primary-subtle)] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function ReportsPeriodBar({
  periodKind,
  month,
  year,
  from,
  to,
  onPeriodKindChange,
  onMonthChange,
  onYearChange,
  onFromChange,
  onToChange,
}: ReportsPeriodBarProps) {
  const now = new Date()
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)

  const goToPrevMonth = () => {
    if (month === 1) {
      onMonthChange(12)
      onYearChange(year - 1)
    } else {
      onMonthChange(month - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      onMonthChange(1)
      onYearChange(year + 1)
    } else {
      onMonthChange(month + 1)
    }
  }

  const goToTodayMonth = () => {
    onMonthChange(now.getMonth() + 1)
    onYearChange(now.getFullYear())
  }

  const goToPrevYear = () => onYearChange(year - 1)
  const goToNextYear = () => onYearChange(year + 1)
  const goToTodayYear = () => onYearChange(now.getFullYear())

  const monthTitle = format(new Date(year, month - 1), "MMMM yyyy")

  return (
    <div className="spike-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div
          className="spike-segment-group shrink-0"
          role="tablist"
          aria-label="Report period type"
        >
          {PERIOD_TABS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={periodKind === kind}
              data-active={periodKind === kind}
              className="spike-segment-btn"
              onClick={() => onPeriodKindChange(kind)}
            >
              {label}
            </button>
          ))}
        </div>

        <PeriodDivider />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {periodKind === "month" ? (
            <>
              <NavIconButton label="Previous month" onClick={goToPrevMonth}>
                <ChevronLeft className="size-4" />
              </NavIconButton>
              <ClientsMonthToolbar
                compact
                month={month}
                year={year}
                onMonthChange={onMonthChange}
                onYearChange={onYearChange}
              />
              <NavIconButton label="Next month" onClick={goToNextMonth}>
                <ChevronRight className="size-4" />
              </NavIconButton>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-[var(--spike-glass-border)] bg-transparent text-xs spike-text-secondary hover:bg-[var(--spike-primary-subtle)] hover:text-[var(--spike-primary)]"
                onClick={goToTodayMonth}
              >
                Today
              </Button>
              <span className="hidden text-sm font-medium tabular-nums spike-heading md:inline">
                {monthTitle}
              </span>
            </>
          ) : null}

          {periodKind === "year" ? (
            <>
              <NavIconButton label="Previous year" onClick={goToPrevYear}>
                <ChevronLeft className="size-4" />
              </NavIconButton>
              <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
                <SelectTrigger className="h-8 w-[100px] border-[var(--spike-glass-border)] bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NavIconButton label="Next year" onClick={goToNextYear}>
                <ChevronRight className="size-4" />
              </NavIconButton>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-[var(--spike-glass-border)] bg-transparent text-xs spike-text-secondary hover:bg-[var(--spike-primary-subtle)] hover:text-[var(--spike-primary)]"
                onClick={goToTodayYear}
              >
                This year
              </Button>
              <span className="hidden text-sm font-medium tabular-nums spike-heading md:inline">
                {year}
              </span>
            </>
          ) : null}

          {periodKind === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs spike-text-muted">
                <span className="shrink-0">From</span>
                <Input
                  type="date"
                  value={from}
                  className="h-8 w-[140px] border-[var(--spike-glass-border)] bg-transparent text-sm"
                  onChange={(e) => onFromChange(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-xs spike-text-muted">
                <span className="shrink-0">To</span>
                <Input
                  type="date"
                  value={to}
                  className="h-8 w-[140px] border-[var(--spike-glass-border)] bg-transparent text-sm"
                  onChange={(e) => onToChange(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  )
}
