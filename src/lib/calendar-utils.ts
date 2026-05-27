import { BookingStatus } from "@prisma/client"
import {
  addDays,
  differenceInCalendarDays,
  differenceInDays,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns"
import type { CalendarBooking, DayBooking, GapDay } from "@/lib/calendar/types"

export type { CalendarBooking, DayBooking, GapDay } from "@/lib/calendar/types"
export {
  DEFAULT_PLATFORM_COLOR,
  getPlatformColor,
  PLATFORM_COLORS,
} from "@/lib/calendar/platform-colors"

export function buildCalendarDays(month: number, year: number): (Date | null)[] {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const days: (Date | null)[] = []

  const startDow = (firstDay.getDay() + 6) % 7
  for (let i = 0; i < startDow; i++) days.push(null)

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d))
  }

  const remainder = days.length % 7
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) days.push(null)
  }

  return days
}

export function chunkWeeks(days: (Date | null)[]): (Date | null)[][] {
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

function toLocalDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function bookingSpansDate(booking: CalendarBooking, date: Date) {
  const day = toLocalDateKey(date)
  const checkIn = booking.checkIn.split("T")[0] ?? ""
  const checkOut = booking.checkOut.split("T")[0] ?? ""
  return day >= checkIn && day < checkOut
}

export function getBookingsForDay(day: Date, bookings: CalendarBooking[]): DayBooking[] {
  const d = startOfDay(day)

  return bookings
    .filter((b) => {
      const checkIn = startOfDay(new Date(b.checkIn))
      const checkOut = startOfDay(new Date(b.checkOut))
      return checkIn <= d && d < checkOut
    })
    .map((b) => ({
      ...b,
      isStart: isSameDay(new Date(b.checkIn), day),
      isEnd: isSameDay(subDays(new Date(b.checkOut), 1), day),
      isContinuing: true,
    }))
}

export type WeekSegment = {
  booking: CalendarBooking
  startCol: number
  endCol: number
  span: number
  lane: number
  isStart: boolean
  isEnd: boolean
}

export function computeWeekSegments(
  weekDays: (Date | null)[],
  allBookings: CalendarBooking[]
): WeekSegment[] {
  const raw: Array<{
    booking: CalendarBooking
    startCol: number
    endCol: number
    span: number
    isStart: boolean
    isEnd: boolean
  }> = []

  for (const booking of allBookings) {
    let startCol = -1
    let endCol = -1
    for (let i = 0; i < 7; i++) {
      const date = weekDays[i]
      if (!date) continue
      if (bookingSpansDate(booking, date)) {
        if (startCol < 0) startCol = i
        endCol = i
      }
    }
    if (startCol < 0 || endCol < 0) continue

    const startDate = weekDays[startCol]!
    const endDate = weekDays[endCol]!
    raw.push({
      booking,
      startCol,
      endCol,
      span: endCol - startCol + 1,
      isStart: isSameDay(new Date(booking.checkIn), startDate),
      isEnd: isSameDay(subDays(new Date(booking.checkOut), 1), endDate),
    })
  }

  raw.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol
    return b.span - a.span
  })

  const laneEnds: number[] = []
  const segments: WeekSegment[] = []

  for (const seg of raw) {
    let lane = 0
    while (lane < laneEnds.length && !(laneEnds[lane]! < seg.startCol)) {
      lane++
    }
    if (lane === laneEnds.length) {
      laneEnds.push(seg.endCol)
    } else {
      laneEnds[lane] = seg.endCol
    }
    segments.push({ ...seg, lane })
  }

  return segments
}

export function detectGaps(bookings: CalendarBooking[], month: number, year: number): GapDay[] {
  const activeBookings = bookings
    .filter((b) => b.status !== BookingStatus.CANCELLED)
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())

  const gaps: GapDay[] = []
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)

  for (let i = 0; i < activeBookings.length - 1; i++) {
    const current = activeBookings[i]!
    const next = activeBookings[i + 1]!
    const checkOut = startOfDay(new Date(current.checkOut))
    const nextCheckIn = startOfDay(new Date(next.checkIn))
    const gapNights = differenceInDays(nextCheckIn, checkOut)

    if (gapNights > 0 && gapNights <= 3) {
      for (let g = 0; g < gapNights; g++) {
        const date = addDays(checkOut, g)
        if (date >= monthStart && date <= monthEnd) {
          gaps.push({ date, gapLength: gapNights })
        }
      }
    }
  }

  return gaps
}

export function gapKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function buildGapMap(gaps: GapDay[]) {
  const map = new Map<string, number>()
  for (const gap of gaps) {
    map.set(gapKey(gap.date), gap.gapLength)
  }
  return map
}

export function computeMonthStats(bookings: CalendarBooking[], month: number, year: number) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()

  const bookedNights = bookings
    .filter((b) => b.status !== BookingStatus.CANCELLED)
    .reduce((total, b) => {
      const checkIn = new Date(b.checkIn)
      const checkOut = new Date(b.checkOut)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59)
      const start = checkIn < monthStart ? monthStart : checkIn
      const end = checkOut > monthEnd ? monthEnd : checkOut
      const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return total + Math.max(0, nights)
    }, 0)

  const availableNights = daysInMonth - bookedNights
  const occupancyPct = daysInMonth > 0 ? Math.round((bookedNights / daysInMonth) * 100) : 0
  const nightsRemaining = isCurrentMonth ? daysInMonth - today.getDate() : null

  return { daysInMonth, bookedNights, availableNights, occupancyPct, nightsRemaining, isCurrentMonth }
}

export type TimelineBarPlacement = {
  booking: CalendarBooking
  left: string
  width: string
  startDay: number
  endDay: number
  spanDays: number
  lane: number
}

function timelineRange(
  booking: CalendarBooking,
  month: number,
  year: number,
  totalDays: number
): Omit<TimelineBarPlacement, "lane"> | null {
  const firstDay = startOfDay(new Date(year, month - 1, 1))
  const lastDay = startOfDay(new Date(year, month, 0))

  const checkIn = startOfDay(new Date(booking.checkIn))
  const checkOut = startOfDay(new Date(booking.checkOut))

  const start = checkIn < firstDay ? firstDay : checkIn
  const end = checkOut > lastDay ? addDays(lastDay, 1) : checkOut

  const startDay = differenceInDays(start, firstDay)
  const endDay = differenceInDays(end, firstDay) - 1

  if (endDay < startDay) return null

  const spanDays = endDay - startDay + 1
  const left = ((startDay / totalDays) * 100).toFixed(2) + "%"
  const width = ((spanDays / totalDays) * 100).toFixed(2) + "%"

  return { booking, left, width, startDay, endDay, spanDays }
}

/** Timeline bar position (% of month track). */
export function getBarStyle(
  booking: CalendarBooking,
  month: number,
  year: number,
  totalDays: number
): { left: string; width: string } | null {
  const range = timelineRange(booking, month, year, totalDays)
  if (!range) return null
  return { left: range.left, width: range.width }
}

/** Stack overlapping bookings into lanes for the portfolio timeline. */
export function computeTimelineLanes(
  bookings: CalendarBooking[],
  month: number,
  year: number,
  totalDays: number
): TimelineBarPlacement[] {
  const raw = bookings
    .map((b) => timelineRange(b, month, year, totalDays))
    .filter((r): r is Omit<TimelineBarPlacement, "lane"> => r != null)

  raw.sort((a, b) => {
    if (a.startDay !== b.startDay) return a.startDay - b.startDay
    return b.spanDays - a.spanDays
  })

  const laneEnds: number[] = []
  const placed: TimelineBarPlacement[] = []

  for (const item of raw) {
    let lane = 0
    while (lane < laneEnds.length && laneEnds[lane]! >= item.startDay) {
      lane++
    }
    if (lane === laneEnds.length) {
      laneEnds.push(item.endDay)
    } else {
      laneEnds[lane] = item.endDay
    }
    placed.push({ ...item, lane })
  }

  return placed
}
