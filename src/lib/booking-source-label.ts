import type { BookingSource } from "@prisma/client"

/** Display label for booking source (forms, tables). */
export function bookingSourceLabel(source: BookingSource): string {
  switch (source) {
    case "AIRBNB":
      return "Airbnb"
    case "BOOKING_COM":
      return "Booking.com"
    case "DIRECT":
      return "Direct"
    default:
      return "Other"
  }
}

/** Default channel_name slug when user picks a source without typing channel. */
export function defaultChannelNameForSource(source: BookingSource): string {
  switch (source) {
    case "AIRBNB":
      return "airbnb_official"
    case "BOOKING_COM":
      return "booking_dot_com"
    case "DIRECT":
      return "uplisting"
    default:
      return "other"
  }
}

/** Whether a booking row was entered manually (not CSV / Uplisting sync). */
export function isManualBookingEntry(row: {
  csv_imported_at: string | null | undefined
  uplisting_id?: string | null | undefined
}): boolean {
  return !row.csv_imported_at && !row.uplisting_id
}
