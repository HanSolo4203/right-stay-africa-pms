import type { BookingStatus } from "@prisma/client"
import { differenceInCalendarDays } from "date-fns"
import { getAnalyticsChannelLabel } from "@/lib/booking-channel-label"
import type { CalendarBooking } from "@/lib/calendar/types"

export const calendarBookingSelect = {
  id: true,
  guest_name: true,
  check_in: true,
  check_out: true,
  source: true,
  status: true,
  confirmation_code: true,
  channel_name: true,
  accommodation_total: true,
  total_payout: true,
} as const

export type CalendarBookingRow = {
  id: string
  guest_name: string
  check_in: Date
  check_out: Date
  source: Parameters<typeof getAnalyticsChannelLabel>[1]
  status: BookingStatus
  confirmation_code: string | null
  channel_name: string | null
  accommodation_total: { toString(): string } | null
  total_payout: { toString(): string } | null
}

export function serializeCalendarBooking(row: CalendarBookingRow): CalendarBooking {
  const nights = Math.max(0, differenceInCalendarDays(row.check_out, row.check_in))
  return {
    id: row.id,
    guestName: row.guest_name,
    checkIn: row.check_in.toISOString(),
    checkOut: row.check_out.toISOString(),
    platform: getAnalyticsChannelLabel(row.channel_name, row.source),
    status: row.status,
    confirmationCode: row.confirmation_code,
    nights,
    payout: row.total_payout?.toString() ?? null,
    accommodationAmount: row.accommodation_total?.toString() ?? null,
  }
}
