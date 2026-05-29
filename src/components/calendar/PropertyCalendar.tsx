"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BookingBar } from "@/components/calendar/BookingBar"
import { BookingDetailPanel } from "@/components/calendar/booking-detail-panel"
import { CalendarDay } from "@/components/calendar/CalendarDay"
import { CalendarLegend } from "@/components/calendar/calendar-legend"
import { CalendarMonthNav, useCalendarMonthNavigation } from "@/components/calendar/calendar-month-nav"
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton"
import { CalendarStatsBar } from "@/components/calendar/calendar-stats-bar"
import { Card, CardContent } from "@/components/ui/card"
import {
  buildCalendarDays,
  buildGapMap,
  chunkWeeks,
  computeMonthStats,
  computeWeekSegments,
  detectGaps,
  gapKey,
} from "@/lib/calendar-utils"
import { PropertyCleaningMonthSummary } from "@/components/cleaning/PropertyCleaningMonthSummary"
import type { CalendarCleaningMarker } from "@/lib/cleaning/calendar-markers"
import type { CalendarBooking } from "@/lib/calendar/types"

export type { CalendarBooking } from "@/lib/calendar/types"

interface PropertyCalendarProps {
  propertyId: string
  propertyName: string
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export function PropertyCalendar({ propertyId, propertyName }: PropertyCalendarProps) {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [cleaningTasks, setCleaningTasks] = useState<CalendarCleaningMarker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null)
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null)

  const { goToPrevMonth, goToNextMonth, goToToday } = useCalendarMonthNavigation(
    month,
    year,
    setMonth,
    setYear
  )

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/calendar?month=${month}&year=${year}`)
      if (!res.ok) {
        setBookings([])
        return
      }
      const data = await res.json()
      setBookings(data.bookings ?? [])
      setCleaningTasks(data.cleaningTasks ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [propertyId, month, year])

  useEffect(() => {
    void fetchCalendar()
  }, [fetchCalendar])

  const today = useMemo(() => new Date(), [])
  const calendarDays = useMemo(() => buildCalendarDays(month, year), [month, year])
  const weeks = useMemo(() => chunkWeeks(calendarDays), [calendarDays])
  const gapMap = useMemo(() => buildGapMap(detectGaps(bookings, month, year)), [bookings, month, year])
  const stats = useMemo(() => computeMonthStats(bookings, month, year), [bookings, month, year])

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardContent className="space-y-4 p-4">
          <p className="text-xs text-slate-500">{propertyName}</p>

          <CalendarMonthNav
            month={month}
            year={year}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            onToday={goToToday}
          />

          <CalendarLegend showCleaningMarkers />

          <PropertyCleaningMonthSummary propertyId={propertyId} month={month} year={year} />

          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <>
              <CalendarStatsBar
                bookedNights={stats.bookedNights}
                availableNights={stats.availableNights}
                occupancyPct={stats.occupancyPct}
                nightsRemaining={stats.nightsRemaining}
              />

              <div className="mb-1 grid grid-cols-7">
                {WEEKDAY_HEADERS.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-medium text-slate-400">
                    {d}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {weeks.map((weekDays, weekIdx) => {
                  const segments = computeWeekSegments(weekDays, bookings)
                  const laneCount =
                    segments.length > 0 ? Math.max(...segments.map((s) => s.lane)) + 1 : 0

                  return (
                    <div
                      key={weekIdx}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-sm"
                    >
                      <div className="grid grid-cols-7 gap-px">
                        {weekDays.map((day, dayIdx) => (
                          <CalendarDay
                            key={dayIdx}
                            day={day}
                            bookings={bookings}
                            cleaningTasks={cleaningTasks}
                            today={today}
                            month={month}
                            gapLength={day ? gapMap.get(gapKey(day)) : undefined}
                          />
                        ))}
                      </div>
                      {laneCount > 0 ? (
                        <div
                          className="grid gap-px bg-slate-200 p-px"
                          style={{
                            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                            gridTemplateRows: `repeat(${laneCount}, minmax(22px, auto))`,
                          }}
                        >
                          {segments.map((s) => (
                            <BookingBar
                              key={`${s.booking.id}-w${weekIdx}-l${s.lane}`}
                              variant="grid"
                              booking={s.booking}
                              propertyName={propertyName}
                              gridColumn={`${s.startCol + 1} / span ${s.span}`}
                              gridRow={s.lane + 1}
                              isStart={s.isStart}
                              isEnd={s.isEnd}
                              isSelected={selectedBooking?.id === s.booking.id}
                              isHovered={hoveredBooking === s.booking.id}
                              onClick={() => setSelectedBooking(s.booking)}
                              onMouseEnter={() => setHoveredBooking(s.booking.id)}
                              onMouseLeave={() => setHoveredBooking(null)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {selectedBooking && !isLoading ? (
            <BookingDetailPanel booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
