import { mapUplistingBooking as mapBookingFromUplisting } from "@/lib/uplisting/sync-bookings"
export { syncAllPropertiesFullPreserveManual, syncSingleProperty } from "@/lib/uplisting/sync-properties"

// Thin wrapper so other modules can share the same booking mapping
export const mapUplistingBooking = mapBookingFromUplisting

export function mapPlatform(source: string | undefined | null): string {
  if (!source) return "unknown"
  const s = source.toLowerCase()
  if (s.includes("airbnb")) return "Airbnb"
  if (s.includes("booking")) return "Booking.com"
  if (s.includes("vrbo") || s.includes("homeaway")) return "Vrbo"
  if (s.includes("direct") || s === "direct") return "Direct"
  if (s.includes("google")) return "Google"
  return source
}

export function mapStatus(event: string | undefined, dataStatus?: string | null): string {
  const ev = (event ?? "").toLowerCase()
  if (ev.includes("cancel")) return "cancelled"
  if (ev.includes("modif") || ev.includes("alter")) return "modified"
  if (ev.includes("request") || ev.includes("pending")) return "pending"

  if (dataStatus) {
    const s = dataStatus.toLowerCase()
    if (s.includes("cancel")) return "cancelled"
    if (s.includes("pending")) return "pending"
    if (s.includes("modif")) return "modified"
  }

  return "confirmed"
}

export function uplistingAuthHeaders(): HeadersInit {
  const key = process.env.UPLISTING_API_KEY
  if (!key) throw new Error("UPLISTING_API_KEY not set")

  return {
    Authorization: `Basic ${Buffer.from(key).toString("base64")}`,
    "Content-Type": "application/json",
  }
}

export function validateUplistingConfig(): {
  configured: boolean
  missingKeys: string[]
} {
  const missing: string[] = []
  if (!process.env.UPLISTING_API_KEY) missing.push("UPLISTING_API_KEY")
  if (!process.env.UPLISTING_WEBHOOK_SECRET) missing.push("UPLISTING_WEBHOOK_SECRET")

  return { configured: missing.length === 0, missingKeys: missing }
}

