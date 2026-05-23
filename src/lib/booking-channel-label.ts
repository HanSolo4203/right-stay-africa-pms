import type { BookingSource } from "@prisma/client"

const SOURCE_LABEL: Record<BookingSource, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  DIRECT: "Direct",
  OTHER: "Other",
}

/** Channel display label for statements and analytics (client-safe). */
export function getAnalyticsChannelLabel(
  channelName: string | null | undefined,
  source: BookingSource
): string {
  const raw = channelName?.trim()
  if (raw) {
    const key = raw.toLowerCase()
    if (key.includes("airbnb")) return "Airbnb"
    if (key.includes("booking")) return "Booking.com"
    if (key === "uplisting" || key === "direct" || key.includes("direct")) return "Direct"
    return raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return SOURCE_LABEL[source]
}
