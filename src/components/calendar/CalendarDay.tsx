"use client"

import { isSameDay } from "date-fns"
import type { CalendarCleaningMarker } from "@/lib/cleaning/calendar-markers"
import { cleansForDay } from "@/lib/cleaning/calendar-markers"
import type { CalendarBooking } from "@/lib/calendar/types"
import { cn } from "@/lib/utils"

type CalendarDayProps = {
  day: Date | null
  bookings: CalendarBooking[]
  cleaningTasks?: CalendarCleaningMarker[]
  today: Date
  month: number
  gapLength?: number
}

/** Day cell header (number, today, gap, checkout) — booking bars render in the week row below. */
export function CalendarDay({
  day,
  bookings,
  cleaningTasks = [],
  today,
  month,
  gapLength,
}: CalendarDayProps) {
  if (!day) {
    return <div className="min-h-9 bg-slate-50" />
  }

  const isToday = isSameDay(day, today)
  const isWeekend = day.getDay() === 0 || day.getDay() === 6
  const isGapDay = gapLength != null && gapLength > 0
  const hasCheckout = bookings.some((b) => isSameDay(new Date(b.checkOut), day))
  const dayCleans = cleansForDay(cleaningTasks, day)

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

      {dayCleans.length > 0 ? (
        <div className="absolute bottom-0.5 left-0.5 right-0.5 flex flex-wrap justify-center gap-0.5">
          {dayCleans.slice(0, 3).map((c) => (
            <span
              key={c.id}
              title={`${c.type === "checkout" ? "Checkout" : "Mid-stay"} clean — ${c.guestName ?? "Guest"} (${c.status})`}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                c.type === "checkout" ? "bg-blue-500" : "bg-amber-500",
                c.status === "completed" && "opacity-40",
                c.status === "skipped" && "opacity-25",
              )}
            />
          ))}
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
