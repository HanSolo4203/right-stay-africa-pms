"use client"

import { useMemo, useState } from "react"
import { BookingSource, BookingStatus } from "@prisma/client"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { CreateBookingModal } from "@/components/bookings/create-booking-modal"
import { BookingFormModal } from "@/components/bookings/booking-form-modal"
import { BookingList, type BookingListRow, formatChannelLabel } from "@/components/bookings/booking-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type BookingsTabProps = {
  propertyId: string
  userRole: "SUPER_ADMIN" | "PROPERTY_MANAGER" | "OWNER" | null
  bookings: BookingListRow[]
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

/** Local calendar date (avoids UTC shifting day boundaries). */
function toLocalDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function bookingSpansDate(booking: BookingListRow, date: Date) {
  const day = toLocalDateKey(date)
  const checkIn = booking.check_in.split("T")[0] ?? ""
  const checkOut = booking.check_out.split("T")[0] ?? ""
  return day >= checkIn && day < checkOut
}

type OtaKind = "airbnb" | "booking_com" | "direct" | "other"

function getOtaKind(booking: BookingListRow): OtaKind {
  const raw = booking.channel_name?.trim().toLowerCase() ?? ""
  if (raw.includes("airbnb") || booking.source === BookingSource.AIRBNB) return "airbnb"
  if (raw.includes("booking") || booking.source === BookingSource.BOOKING_COM) return "booking_com"
  if (
    raw === "direct" ||
    raw.includes("direct") ||
    raw === "uplisting" ||
    raw.includes("uplisting") ||
    booking.source === BookingSource.DIRECT
  )
    return "direct"
  return "other"
}

const otaBarClass: Record<OtaKind, string> = {
  airbnb: "border border-rose-300/70 bg-rose-100 text-rose-950 hover:bg-rose-200/90",
  booking_com: "border border-sky-300/70 bg-sky-100 text-sky-950 hover:bg-sky-200/90",
  direct: "border border-emerald-300/70 bg-emerald-100 text-emerald-950 hover:bg-emerald-200/90",
  other: "border border-violet-300/70 bg-violet-100 text-violet-950 hover:bg-violet-200/90",
}

type WeekSegment = {
  booking: BookingListRow
  startCol: number
  endCol: number
  span: number
  lane: number
}

function computeWeekSegments(weekDays: Date[], allBookings: BookingListRow[]): WeekSegment[] {
  const raw: Array<{ booking: BookingListRow; startCol: number; endCol: number; span: number }> = []

  for (const booking of allBookings) {
    if (booking.status === BookingStatus.CANCELLED) continue

    let startCol = -1
    let endCol = -1
    for (let i = 0; i < 7; i++) {
      if (bookingSpansDate(booking, weekDays[i]!)) {
        if (startCol < 0) startCol = i
        endCol = i
      }
    }
    if (startCol < 0 || endCol < 0) continue

    raw.push({
      booking,
      startCol,
      endCol,
      span: endCol - startCol + 1,
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

function chunkWeeks(days: Date[]) {
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

function formatMoney(amount: number) {
  if (!Number.isFinite(amount)) return "—"
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function BookingsTab({ propertyId, userRole, bookings }: BookingsTabProps) {
  const router = useRouter()
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [selectedBooking, setSelectedBooking] = useState<BookingListRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const canEditBookings = userRole === "SUPER_ADMIN" || userRole === "PROPERTY_MANAGER"

  const monthLabel = new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(monthDate)

  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const startWeekday = firstOfMonth.getDay()
    const startDate = new Date(year, month, 1 - startWeekday)
    return Array.from({ length: 42 }, (_, index) => {
      const current = new Date(startDate)
      current.setDate(startDate.getDate() + index)
      return current
    })
  }, [monthDate])

  const monthBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const checkIn = new Date(booking.check_in)
        return (
          checkIn.getFullYear() === monthDate.getFullYear() &&
          checkIn.getMonth() === monthDate.getMonth()
        )
      })
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
  }, [bookings, monthDate])

  const monthRevenueMetrics = useMemo(() => {
    let gross = 0
    let net = 0
    for (const b of monthBookings) {
      if (b.status === BookingStatus.CANCELLED) continue
      gross += Number(b.gross_revenue ?? 0) || 0
      net += Number(b.net_revenue ?? 0) || 0
    }
    return { gross, net }
  }, [monthBookings])

  const openBooking = (row: BookingListRow) => {
    setSelectedBooking(row)
    setModalOpen(true)
  }

  const createModal = (
    <CreateBookingModal
      open={createOpen}
      onOpenChange={setCreateOpen}
      propertyId={propertyId}
      onCreated={() => router.refresh()}
    />
  )

  const addBookingButton = canEditBookings ? (
    <Button
      type="button"
      size="sm"
      className="bg-green-700 text-white hover:bg-green-800"
      onClick={() => setCreateOpen(true)}
    >
      <Plus className="mr-1 size-4" />
      Add booking
    </Button>
  ) : null

  if (bookings.length === 0) {
    return (
      <>
        <Card className="bg-white">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              No bookings yet. Sync from Uplisting, import a CSV, or add a booking manually for stays
              missing from export.
            </p>
            {addBookingButton}
          </CardContent>
        </Card>
        {createModal}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{monthLabel}</h3>
            <div className="flex flex-wrap items-center gap-2">
              {addBookingButton}
              <Button type="button" size="sm" variant="outline" onClick={() => setMonthDate(addMonths(monthDate, -1))}>
                ←
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setMonthDate(addMonths(monthDate, 1))}>
                →
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Gross revenue</p>
              <p className="text-lg font-semibold text-slate-900">{formatMoney(monthRevenueMetrics.gross)}</p>
              <p className="text-[11px] text-slate-500">From Uplisting CSV where available · excl. cancelled</p>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Net revenue</p>
              <p className="text-lg font-semibold text-slate-900">{formatMoney(monthRevenueMetrics.net)}</p>
              <p className="text-[11px] text-slate-500">Not estimated from nightly rate</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="px-2 py-1 font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {chunkWeeks(calendarDays).map((weekDays, weekIdx) => {
              const segments = computeWeekSegments(weekDays, bookings)
              const laneCount =
                segments.length > 0 ? Math.max(...segments.map((s) => s.lane)) + 1 : 0

              return (
                <div
                  key={weekIdx}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-sm"
                >
                  <div className="grid grid-cols-7 gap-px">
                    {weekDays.map((date) => {
                      const isCurrentMonth = date.getMonth() === monthDate.getMonth()
                      return (
                        <div
                          key={toLocalDateKey(date)}
                          className={`min-h-9 bg-white px-1 py-1.5 text-center text-[11px] font-medium tabular-nums ${
                            isCurrentMonth ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      )
                    })}
                  </div>
                  {laneCount > 0 ? (
                    <div
                      className="grid gap-px bg-slate-200 p-px"
                      style={{
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gridTemplateRows: `repeat(${laneCount}, minmax(22px, auto))`,
                      }}
                    >
                      {segments.map((s) => {
                        const ota = getOtaKind(s.booking)
                        const label = formatChannelLabel(s.booking.channel_name, s.booking.source)
                        return (
                          <button
                            key={`${s.booking.id}-w${weekIdx}`}
                            type="button"
                            className={`truncate rounded-sm px-1.5 py-0.5 text-left text-[10px] font-medium leading-5 shadow-sm ${otaBarClass[ota]}`}
                            style={{
                              gridColumn: `${s.startCol + 1} / span ${s.span}`,
                              gridRow: s.lane + 1,
                            }}
                            title={`${s.booking.guest_name} · ${label}`}
                            onClick={() => openBooking(s.booking)}
                          >
                            {s.booking.guest_name}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-600">
            <span className="font-medium text-slate-500">Channel:</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm border border-rose-300/70 bg-rose-100" />
              Airbnb
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm border border-sky-300/70 bg-sky-100" />
              Booking.com
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm border border-emerald-300/70 bg-emerald-100" />
              Direct / Uplisting
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded-sm border border-violet-300/70 bg-violet-100" />
              Other
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Guest details</h3>
            <p className="text-xs text-slate-500">
              {canEditBookings
                ? "Click a row to view details and edit nightly rate or notes."
                : "Click a row to view booking details."}
            </p>
          </div>
          {monthBookings.length === 0 ? (
            <p className="text-sm text-slate-500">No check-ins for this month.</p>
          ) : (
            <BookingList bookings={monthBookings} onRowClick={(b) => openBooking(b)} />
          )}
        </CardContent>
      </Card>

      <BookingFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedBooking(null)
        }}
        propertyId={propertyId}
        booking={selectedBooking}
        canEdit={canEditBookings}
      />
      {createModal}
    </div>
  )
}
