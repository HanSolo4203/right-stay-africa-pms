"use client"

import { isSameDay } from "date-fns"
import type { CalendarBooking } from "@/lib/calendar/types"
import { cn } from "@/lib/utils"

type CalendarDayProps = {
  day: Date | null
  bookings: CalendarBooking[]
  today: Date
  month: number
  gapLength?: number
}

/** Day cell header (number, today, gap, checkout) — booking bars render in the week row below. */
export function CalendarDay({ day, bookings, today, month, gapLength }: CalendarDayProps) {
  if (!day) {
    return <div className="min-h-9 bg-slate-50" />
  }

  const isToday = isSameDay(day, today)
  const isWeekend = day.getDay() === 0 || day.getDay() === 6
  const isGapDay = gapLength != null && gapLength > 0
  const hasCheckout = bookings.some((b) => isSameDay(new Date(b.checkOut), day))

  return (
    <div
      className={cn(
        "relative min-h-9 bg-white px-1 py-1.5",
        isWeekend && "bg-slate-50/50",
        day.getMonth() !== month - 1 && "opacity-30"
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
          isToday ? "bg-slate-900 text-white" : "text-slate-600"
        )}
      >
        {day.getDate()}
      </div>

      {hasCheckout ? (
        <div className="absolute top-1 right-1" title="Check-out day">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        </div>
      ) : null}

      {isGapDay ? (
        <div
          className="absolute right-0 bottom-0 left-0 h-0.5 bg-amber-400"
          title={`${gapLength}-night gap`}
        />
      ) : null}
    </div>
  )
}
