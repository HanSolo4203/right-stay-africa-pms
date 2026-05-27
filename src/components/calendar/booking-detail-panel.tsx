"use client"

import { X } from "lucide-react"
import {
  BookingCardShell,
  BookingDateRange,
  BookingStatTiles,
  formatPayout,
  bookingNights,
} from "@/components/calendar/booking-card-shared"
import type { CalendarBooking } from "@/lib/calendar/types"

export type BookingDetail = CalendarBooking & {
  propertyName?: string
}

type BookingDetailPanelProps = {
  booking: BookingDetail
  onClose: () => void
}

export function BookingDetailPanel({ booking, onClose }: BookingDetailPanelProps) {
  const payout = formatPayout(booking.payout) ?? "—"
  const nights = bookingNights(booking)

  return (
    <div className="relative mt-4 animate-in duration-200 slide-in-from-bottom-2">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-700"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>

      <BookingCardShell booking={booking} propertyName={booking.propertyName}>
        <BookingDateRange booking={booking} />
        <BookingStatTiles booking={booking} />
        {!booking.payout ? (
          <p className="text-center text-xs text-slate-400">
            {nights} night{nights === 1 ? "" : "s"} · Payout not recorded
          </p>
        ) : (
          <p className="text-center text-xs text-slate-400">
            Total payout <span className="font-semibold text-emerald-800">{payout}</span>
          </p>
        )}
      </BookingCardShell>
    </div>
  )
}
