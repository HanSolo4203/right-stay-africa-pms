import { BookingStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type LiveBookingDto = {
  id: string
  uplistingId: string | null
  guestName: string
  guestEmail: string | null
  checkIn: string
  checkOut: string
  nights: number
  platform: string | null
  status: string
  totalPrice: number | null
  currency: string
  lastSyncedAt: string | null
  accommodationTotal: number | null
  cleaningFee: number | null
  channelCommission: number | null
  managementFee: number | null
  payout: number | null
  origin: "webhook" | "api_sync"
}

const STATUS_QUERY_MAP: Record<string, BookingStatus> = {
  confirmed: BookingStatus.CONFIRMED,
  checked_in: BookingStatus.CHECKED_IN,
  checked_out: BookingStatus.CHECKED_OUT,
  cancelled: BookingStatus.CANCELLED,
}

export function parseStatusFilter(statusParam: string | null): BookingStatus | undefined {
  if (!statusParam?.trim()) return undefined
  return STATUS_QUERY_MAP[statusParam.trim().toLowerCase()]
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime()
  if (ms <= 0) return 0
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function currencyFromRaw(raw: Prisma.JsonValue | null): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "ZAR"
  const attrs =
    "attributes" in raw && raw.attributes && typeof raw.attributes === "object"
      ? (raw.attributes as Record<string, unknown>)
      : (raw as Record<string, unknown>)
  const c = attrs.currency
  return typeof c === "string" && c.trim() ? c : "ZAR"
}

function platformLabel(source: string | null, channel: string | null): string | null {
  const label = channel?.trim() || source?.trim()
  if (!label) return null
  return label.replace(/_/g, " ")
}

export function toLiveBookingDto(booking: {
  id: string
  uplisting_id: string | null
  guest_name: string
  guest_email: string | null
  check_in: Date
  check_out: Date
  source: string
  channel_name: string | null
  status: BookingStatus
  total: Prisma.Decimal
  uplisting_raw: Prisma.JsonValue | null
  last_synced_at: Date | null
}): LiveBookingDto {
  return {
    id: booking.id,
    uplistingId: booking.uplisting_id,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    checkIn: booking.check_in.toISOString(),
    checkOut: booking.check_out.toISOString(),
    nights: nightsBetween(booking.check_in, booking.check_out),
    platform: platformLabel(booking.source, booking.channel_name),
    status: booking.status.toLowerCase(),
    totalPrice: Number(booking.total),
    currency: currencyFromRaw(booking.uplisting_raw),
    lastSyncedAt: booking.last_synced_at?.toISOString() ?? null,
    accommodationTotal: null,
    cleaningFee: null,
    channelCommission: null,
    managementFee: null,
    payout: null,
    origin: "api_sync",
  }
}

export async function fetchLiveBookingsForProperty(
  propertyId: string,
  statusFilter?: BookingStatus
) {
  return prisma.booking.findMany({
    where: {
      property_id: propertyId,
      uplisting_id: { not: null },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { check_in: "desc" },
    select: {
      id: true,
      uplisting_id: true,
      guest_name: true,
      guest_email: true,
      check_in: true,
      check_out: true,
      source: true,
      channel_name: true,
      status: true,
      total: true,
      uplisting_raw: true,
      last_synced_at: true,
    },
  })
}

const MIN_SYNC_INTERVAL_MS = 4_000

/** Enforces ~15 syncs/min per property (Uplisting per-property limit). */
export async function assertPropertySyncRateLimit(propertyId: string): Promise<string | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { last_synced_at: true },
  })

  if (
    property?.last_synced_at &&
    Date.now() - property.last_synced_at.getTime() < MIN_SYNC_INTERVAL_MS
  ) {
    return "Please wait a few seconds before syncing again (max 15 syncs per minute per property)."
  }

  return null
}

export async function resolveUplistingPropertyId(propertyId: string): Promise<{
  uplistingId: string | null
  error: string | null
}> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { uplisting_id: true },
  })

  if (!property) {
    return { uplistingId: null, error: "Property not found." }
  }

  const uplistingId = property.uplisting_id?.trim()
  if (!uplistingId) {
    return {
      uplistingId: null,
      error: "Property is not linked to Uplisting. Set uplisting_id on the property first.",
    }
  }

  return { uplistingId, error: null }
}
