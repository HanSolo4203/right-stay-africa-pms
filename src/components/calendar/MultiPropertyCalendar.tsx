"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { isSameDay } from "date-fns"
import { BookingBar } from "@/components/calendar/BookingBar"
import { BookingDetailPanel, type BookingDetail } from "@/components/calendar/booking-detail-panel"
import { CalendarLegend } from "@/components/calendar/calendar-legend"
import { CalendarMonthNav, useCalendarMonthNavigation } from "@/components/calendar/calendar-month-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { computeTimelineLanes } from "@/lib/calendar-utils"
import type { CalendarBooking } from "@/lib/calendar/types"

const PROPERTY_COL_WIDTH = "11rem"
const DAY_COL_PX = 32
const LANE_HEIGHT = 22
const ROW_PAD_Y = 8

type PortfolioPropertyRow = {
  id: string
  name: string
  unitNumber: string | null
  bookings: CalendarBooking[]
  bookedNights: number
  occupancyPct: number
}

type PortfolioCalendarResponse = {
  month: number
  year: number
  daysInMonth: number
  properties: PortfolioPropertyRow[]
}

function PropertyTimelineRow({
  property,
  month,
  year,
  daysInMonth,
  today,
  isCurrentMonth,
  onSelectBooking,
}: {
  property: PortfolioPropertyRow
  month: number
  year: number
  daysInMonth: number
  today: Date
  isCurrentMonth: boolean
  onSelectBooking: (booking: BookingDetail) => void
}) {
  const placements = useMemo(
    () => computeTimelineLanes(property.bookings, month, year, daysInMonth),
    [property.bookings, month, year, daysInMonth]
  )

  const laneCount = placements.length > 0 ? Math.max(...placements.map((p) => p.lane)) + 1 : 1
  const trackHeight = ROW_PAD_Y * 2 + laneCount * LANE_HEIGHT
  const timelineMinWidth = daysInMonth * DAY_COL_PX

  return (
    <div
      className="flex border-b border-slate-100"
      style={{ minHeight: Math.max(48, trackHeight) }}
    >
      <div
        className="sticky left-0 z-20 shrink-0 overflow-hidden border-r border-slate-200 bg-white py-2 pr-3 pl-1"
        style={{ width: PROPERTY_COL_WIDTH }}
      >
        <Link
          href={`/dashboard/properties/${property.id}?tab=calendar`}
          className="block truncate text-sm font-medium text-slate-900 hover:text-green-dark"
          title={property.name}
        >
          {property.name}
        </Link>
        {property.unitNumber ? (
          <p className="truncate text-xs text-slate-400" title={property.unitNumber}>
            {property.unitNumber}
          </p>
        ) : null}
      </div>

      <div
        className="relative shrink-0 overflow-hidden bg-slate-50/40 py-2"
        style={{ width: timelineMinWidth, height: trackHeight }}
      >
        {Array.from({ length: daysInMonth }).map((_, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 border-l ${
              i === today.getDate() - 1 && isCurrentMonth
                ? "z-10 border-dashed border-amber-400"
                : "border-slate-200/80"
            }`}
            style={{ left: `${(i / daysInMonth) * 100}%` }}
          />
        ))}

        {placements.map((placement) => (
          <BookingBar
            key={placement.booking.id}
            variant="timeline"
            booking={placement.booking}
            propertyName={property.name}
            left={placement.left}
            width={placement.width}
            lane={placement.lane}
            showLabel={placement.spanDays >= 2}
            onClick={() =>
              onSelectBooking({ ...placement.booking, propertyName: property.name })
            }
          />
        ))}

        {property.bookings.length === 0 ? (
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-xs text-slate-300 italic">No bookings</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MultiPropertyCalendar() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<PortfolioCalendarResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null)

  const { goToPrevMonth, goToNextMonth, goToToday } = useCalendarMonthNavigation(
    month,
    year,
    setMonth,
    setYear
  )

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/calendar?month=${month}&year=${year}`)
      if (!res.ok) {
        setData(null)
        return
      }
      setData(await res.json())
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    void fetchPortfolio()
  }, [fetchPortfolio])

  const today = useMemo(() => new Date(), [])
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()
  const daysInMonth = data?.daysInMonth ?? new Date(year, month, 0).getDate()
  const timelineMinWidth = daysInMonth * DAY_COL_PX

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">Occupancy across all properties for the selected month.</p>
      </div>

      <Card className="bg-white">
        <CardContent className="space-y-4 p-4">
          <CalendarMonthNav
            month={month}
            year={year}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            onToday={goToToday}
          />

          <CalendarLegend />

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.properties.length === 0 ? (
            <p className="text-sm text-slate-500">No properties found.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <div
                  className="inline-flex min-w-full flex-col"
                  style={{ minWidth: `calc(${PROPERTY_COL_WIDTH} + ${timelineMinWidth}px)` }}
                >
                  <div className="flex border-b border-slate-200 bg-white">
                    <div
                      className="sticky left-0 z-30 shrink-0 border-r border-slate-200 bg-white py-2 pr-3 pl-1"
                      style={{ width: PROPERTY_COL_WIDTH }}
                    />
                    <div
                      className="flex shrink-0 bg-white"
                      style={{ width: timelineMinWidth }}
                    >
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                        const date = new Date(year, month - 1, d)
                        const isToday = isSameDay(date, today)
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6
                        return (
                          <div
                            key={d}
                            className={`shrink-0 py-1 text-center text-xs ${
                              isToday ? "font-bold text-amber-600" : ""
                            } ${isWeekend ? "text-slate-400" : "text-slate-500"}`}
                            style={{ width: DAY_COL_PX }}
                          >
                            {d}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    {data.properties.map((property) => (
                      <PropertyTimelineRow
                        key={property.id}
                        property={property}
                        month={month}
                        year={year}
                        daysInMonth={daysInMonth}
                        today={today}
                        isCurrentMonth={isCurrentMonth}
                        onSelectBooking={setSelectedBooking}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedBooking && !isLoading ? (
            <BookingDetailPanel
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
