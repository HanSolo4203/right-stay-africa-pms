import { Prisma } from "@prisma/client"
import {
  mapUplistingBooking as mapJsonApiBooking,
  normalizeWebhookResources,
  type WebhookPayload,
} from "@/lib/integrations/uplisting"
import { prisma } from "@/lib/prisma"
import { upsertBookingFromUplistingResource } from "@/lib/uplisting/sync-bookings"
import type { UplistingBooking } from "@/lib/uplisting/client"

type EventStylePayload = {
  event?: string
  data?: Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asDate(value: unknown): Date | null {
  const s = asString(value)
  if (!s) return null
  const d = new Date(s.includes("T") ? s : `${s}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function statusFromEvent(event: string | undefined, dataStatus: unknown): string | null {
  const fromData = asString(dataStatus)
  if (fromData) return fromData
  const ev = (event ?? "").toLowerCase()
  if (ev.includes("cancelled")) return "cancelled"
  if (ev.includes("confirmed")) return "confirmed"
  if (ev.includes("updated")) return "confirmed"
  return null
}

function eventDataToUplistingBooking(
  data: Record<string, unknown>,
  event?: string
): UplistingBooking | null {
  const id = asString(data.id)
  const propertyId =
    asString(data.listing_id) ??
    asString(data.property_id) ??
    asString(data.listingId)
  const checkIn = asString(data.check_in) ?? asString(data.checkIn)
  const checkOut = asString(data.check_out) ?? asString(data.checkOut)

  if (!id || !propertyId || !checkIn || !checkOut) return null

  const status = statusFromEvent(event, data.status) ?? "confirmed"
  const totalPrice = asNumber(data.total_price) ?? asNumber(data.totalPrice)

  return {
    id,
    type: "bookings",
    attributes: {
      check_in: checkIn,
      check_out: checkOut,
      guest_name: asString(data.guest_name) ?? asString(data.guestName),
      guest_email: asString(data.guest_email) ?? asString(data.guestEmail),
      guest_phone: asString(data.guest_phone) ?? asString(data.guestPhone),
      source: asString(data.source) ?? asString(data.platform) ?? "other",
      status,
      total_price: totalPrice,
      currency: asString(data.currency) ?? "ZAR",
      adults: asNumber(data.adults) ?? 1,
      property_id: propertyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }
}

function isEventStylePayload(payload: unknown): payload is EventStylePayload {
  if (!payload || typeof payload !== "object") return false
  const p = payload as EventStylePayload
  return typeof p.event === "string" && p.data != null && typeof p.data === "object"
}

export async function processUplistingWebhookPayload(
  payload: unknown,
  rawPayload: Prisma.InputJsonValue
): Promise<number> {
  let processed = 0

  if (isEventStylePayload(payload)) {
    const event = (payload.event ?? "").toLowerCase()
    if (!event.includes("booking")) {
      return 0
    }

    const booking = eventDataToUplistingBooking(payload.data!, event)
    if (!booking) return 0

    await upsertBookingFromUplistingResource(booking, rawPayload)
    return 1
  }

  const resources = normalizeWebhookResources(payload as WebhookPayload)

  for (const resource of resources) {
    if (!resource || typeof resource !== "object") continue
    const candidate = resource as {
      id?: string
      type?: string
      attributes?: Record<string, unknown>
    }

    if (!candidate.id || !candidate.type || !candidate.attributes) continue

    if (candidate.type === "bookings") {
      const mapped = mapJsonApiBooking({
        id: candidate.id,
        type: candidate.type,
        attributes: candidate.attributes,
      })

      await prisma.uplistingBookingCache.upsert({
        where: { uplisting_id: mapped.uplisting_id },
        update: {
          ...mapped,
          synced_at: new Date(),
          raw_payload: mapped.raw_payload as Prisma.InputJsonValue,
        },
        create: {
          ...mapped,
          raw_payload: mapped.raw_payload as Prisma.InputJsonValue,
        },
      })

      const apiBooking: UplistingBooking = {
        id: candidate.id,
        type: "bookings",
        attributes: {
          check_in: String(candidate.attributes.check_in ?? ""),
          check_out: String(candidate.attributes.check_out ?? ""),
          guest_name:
            typeof candidate.attributes.guest_name === "string"
              ? candidate.attributes.guest_name
              : null,
          guest_email:
            typeof candidate.attributes.guest_email === "string"
              ? candidate.attributes.guest_email
              : null,
          guest_phone:
            typeof candidate.attributes.guest_phone === "string"
              ? candidate.attributes.guest_phone
              : null,
          source: String(candidate.attributes.source ?? "other"),
          status: String(candidate.attributes.status ?? "confirmed"),
          total_price:
            typeof candidate.attributes.total_price === "number"
              ? candidate.attributes.total_price
              : null,
          currency: String(candidate.attributes.currency ?? "ZAR"),
          adults:
            typeof candidate.attributes.adults === "number"
              ? candidate.attributes.adults
              : 1,
          property_id: String(candidate.attributes.property_id ?? ""),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }

      await upsertBookingFromUplistingResource(apiBooking, rawPayload)
      processed += 1
    }
  }

  return processed
}
