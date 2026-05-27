"use client"

import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

type CalendarMonthNavProps = {
  month: number
  year: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function CalendarMonthNav({ month, year, onPrev, onNext, onToday }: CalendarMonthNavProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <h2 className="text-lg font-semibold text-slate-900">
        {format(new Date(year, month - 1), "MMMM yyyy")}
      </h2>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export function useCalendarMonthNavigation(
  month: number,
  year: number,
  setMonth: (m: number) => void,
  setYear: (y: number | ((prev: number) => number)) => void
) {
  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const goToToday = () => {
    setMonth(new Date().getMonth() + 1)
    setYear(new Date().getFullYear())
  }

  return { goToPrevMonth, goToNextMonth, goToToday }
}
