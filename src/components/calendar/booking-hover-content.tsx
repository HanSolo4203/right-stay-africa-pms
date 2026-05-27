"use client"

import { ArrowRight } from "lucide-react"
import {
  BookingCardShell,
  BookingDateRange,
  BookingStatTiles,
} from "@/components/calendar/booking-card-shared"
import type { CalendarBooking } from "@/lib/calendar/types"

export type BookingHoverContentProps = {
  booking: CalendarBooking
  propertyName?: string
}

export function BookingHoverContent({ booking, propertyName }: BookingHoverContentProps) {
  return (
    <BookingCardShell
      booking={booking}
      propertyName={propertyName}
      footer={
        <p className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500">
          Click for full details
          <ArrowRight className="size-3" aria-hidden />
        </p>
      }
    >
      <BookingDateRange booking={booking} />
      <BookingStatTiles booking={booking} />
    </BookingCardShell>
  )
}
