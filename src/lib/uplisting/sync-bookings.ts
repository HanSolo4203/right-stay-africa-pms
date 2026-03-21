import { BookingSource, BookingStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  fetchAllBookings,
  fetchBooking,
  fetchBookingsForProperty,
  type UplistingBooking,
} from "./client"

function mapSource(source: string | null | undefined): BookingSource {
  const normalized = (source ?? "").toLowerCase().trim()
  if (normalized === "airbnb") return BookingSource.AIRBNB
  if (normalized === "booking_com" || normalized === "bookingcom") {
    return BookingSource.BOOKING_COM
  }
  if (normalized === "direct") return BookingSource.DIRECT
  return BookingSource.OTHER
}

function mapStatus(status: string | null | undefined): BookingStatus {
  const normalized = (status ?? "").toLowerCase().trim()
  if (normalized === "confirmed") return BookingStatus.CONFIRMED
  if (normalized === "checked_in") return BookingStatus.CHECKED_IN
  if (normalized === "checked_out") return BookingStatus.CHECKED_OUT
  if (normalized === "cancelled") return BookingStatus.CANCELLED
  return BookingStatus.CONFIRMED
}

export function mapUplistingBooking(
  uplistingBooking: UplistingBooking,
  propertyDbId: string
): Prisma.BookingUncheckedCreateInput {
  const attrs = uplistingBooking.attributes

  return {
    property_id: propertyDbId,
    guest_name: attrs.guest_name ?? "Guest",
    check_in: new Date(attrs.check_in),
    check_out: new Date(attrs.check_out),
    num_guests: attrs.adults ?? 1,
    source: mapSource(attrs.source),
    status: mapStatus(attrs.status),
    total: attrs.total_price ?? 0,
    nightly_rate: 0,
    uplisting_id: uplistingBooking.id,
    uplisting_raw: attrs as unknown as Prisma.InputJsonValue,
    last_synced_at: new Date(),
  }
}

export type SyncBookingsResult = {
  synced: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isUplistingBookingsEndpointMissing(error: unknown) {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return msg.includes("resource not found") || msg.includes("api error 404")
}

const BOOKINGS_ACCESS_MESSAGE =
  "Uplisting booking endpoints are not available for this API key. Enable bookings API access or configure Uplisting webhooks to populate booking cache."

function mapCacheBookingToCreateInput(cache: {
  uplisting_id: string
  uplisting_property_id: string | null
  check_in: Date | null
  check_out: Date | null
  guest_name: string | null
  source: string | null
  status: string | null
  total_price: string | null
  raw_payload: Prisma.JsonValue
}): Prisma.BookingUncheckedCreateInput | null {
  if (!cache.uplisting_property_id || !cache.check_in || !cache.check_out) {
    return null
  }

  return {
    property_id: "",
    guest_name: cache.guest_name ?? "Guest",
    check_in: cache.check_in,
    check_out: cache.check_out,
    num_guests: 1,
    source: mapSource(cache.source),
    status: mapStatus(cache.status),
    total: Number(cache.total_price ?? 0) || 0,
    nightly_rate: 0,
    uplisting_id: cache.uplisting_id,
    uplisting_raw: cache.raw_payload as Prisma.InputJsonValue,
    last_synced_at: new Date(),
  }
}

async function finalizeSyncLog(
  logId: string,
  payload: {
    status: "success" | "error"
    records_synced: number
    error_message?: string | null
  }
) {
  await prisma.uplistingSyncLog.update({
    where: { id: logId },
    data: {
      status: payload.status,
      records_synced: payload.records_synced,
      error_message: payload.error_message ?? null,
      completed_at: new Date(),
    },
  })
}

async function upsertOneBooking(uplistingBooking: UplistingBooking): Promise<
  "created" | "updated" | "skipped"
> {
  const uplistingPropertyId = String(uplistingBooking.attributes.property_id ?? "")
  if (!uplistingPropertyId) {
    console.warn(
      `[uplisting] Skipping booking ${uplistingBooking.id}: missing property_id on booking`
    )
    return "skipped"
  }

  const property = await prisma.property.findUnique({
    where: { uplisting_id: uplistingPropertyId },
    select: { id: true },
  })

  if (!property) {
    console.warn(
      `[uplisting] Skipping booking ${uplistingBooking.id}: no local property for uplisting property ${uplistingPropertyId}`
    )
    return "skipped"
  }

  const mapped = mapUplistingBooking(uplistingBooking, property.id)
  const existing = await prisma.booking.findUnique({
    where: { uplisting_id: uplistingBooking.id },
    select: { id: true },
  })

  await prisma.booking.upsert({
    where: { uplisting_id: uplistingBooking.id },
    update: {
      // Keep manually editable fields untouched on sync updates.
      property_id: mapped.property_id,
      guest_name: mapped.guest_name,
      check_in: mapped.check_in,
      check_out: mapped.check_out,
      num_guests: mapped.num_guests,
      source: mapped.source,
      status: mapped.status,
      total: mapped.total,
      uplisting_raw: mapped.uplisting_raw,
      last_synced_at: mapped.last_synced_at,
    },
    create: mapped,
  })

  return existing ? "updated" : "created"
}

async function upsertOneCachedBooking(cache: {
  uplisting_id: string
  uplisting_property_id: string | null
  check_in: Date | null
  check_out: Date | null
  guest_name: string | null
  source: string | null
  status: string | null
  total_price: string | null
  raw_payload: Prisma.JsonValue
}): Promise<"created" | "updated" | "skipped"> {
  const mapped = mapCacheBookingToCreateInput(cache)
  if (!mapped) return "skipped"

  const property = await prisma.property.findUnique({
    where: { uplisting_id: cache.uplisting_property_id! },
    select: { id: true },
  })

  if (!property) return "skipped"
  mapped.property_id = property.id

  const existing = await prisma.booking.findUnique({
    where: { uplisting_id: cache.uplisting_id },
    select: { id: true },
  })

  await prisma.booking.upsert({
    where: { uplisting_id: cache.uplisting_id },
    update: {
      property_id: mapped.property_id,
      guest_name: mapped.guest_name,
      check_in: mapped.check_in,
      check_out: mapped.check_out,
      num_guests: mapped.num_guests,
      source: mapped.source,
      status: mapped.status,
      total: mapped.total,
      uplisting_raw: mapped.uplisting_raw,
      last_synced_at: mapped.last_synced_at,
    },
    create: mapped,
  })

  return existing ? "updated" : "created"
}

export async function syncBookings(options?: {
  fromDate?: string
  toDate?: string
}): Promise<SyncBookingsResult> {
  const errors: string[] = []
  let created = 0
  let updated = 0
  let skipped = 0

  const log = await prisma.uplistingSyncLog.create({
    data: {
      sync_type: "bookings",
      status: "running",
    },
  })

  try {
    const bookings = await fetchAllBookings({
      from: options?.fromDate,
      to: options?.toDate,
    })

    for (const booking of bookings) {
      try {
        const outcome = await upsertOneBooking(booking)
        if (outcome === "created") created += 1
        else if (outcome === "updated") updated += 1
        else skipped += 1
      } catch (error) {
        errors.push(`[${booking.id}] ${errorMessage(error, "Sync failed for booking.")}`)
      }
    }

    const synced = created + updated
    await finalizeSyncLog(log.id, {
      status: errors.length === 0 ? "success" : "error",
      records_synced: synced,
      error_message: errors.length ? errors.join("; ") : null,
    })

    return { synced, created, updated, skipped, errors }
  } catch (error) {
    const message = errorMessage(error, "Booking sync failed.")
    await finalizeSyncLog(log.id, {
      status: "error",
      records_synced: 0,
      error_message: message,
    })
    return { synced: 0, created: 0, updated: 0, skipped: 0, errors: [message] }
  }
}

export async function syncBookingsForProperty(
  uplistingPropertyId: string
): Promise<SyncBookingsResult> {
  return syncBookingsForPropertyRange(uplistingPropertyId)
}

async function syncBookingsForPropertyRange(
  uplistingPropertyId: string
): Promise<SyncBookingsResult> {
  const errors: string[] = []
  let created = 0
  let updated = 0
  let skipped = 0

  const log = await prisma.uplistingSyncLog.create({
    data: {
      sync_type: "property_bookings",
      status: "running",
    },
  })

  try {
    let bookingsToProcess: UplistingBooking[] | null = null

    try {
      bookingsToProcess = await fetchAllBookings()
    } catch (error) {
      if (!isUplistingBookingsEndpointMissing(error)) throw error
    }

    if (!bookingsToProcess) {
      try {
        bookingsToProcess = await fetchBookingsForProperty(uplistingPropertyId)
      } catch (error) {
        if (!isUplistingBookingsEndpointMissing(error)) throw error
      }
    }

    if (bookingsToProcess) {
      const filtered = bookingsToProcess.filter(
        (booking) => String(booking.attributes.property_id ?? "") === uplistingPropertyId
      )
      for (const booking of filtered) {
        try {
          const outcome = await upsertOneBooking(booking)
          if (outcome === "created") created += 1
          else if (outcome === "updated") updated += 1
          else skipped += 1
        } catch (error) {
          errors.push(`[${booking.id}] ${errorMessage(error, "Sync failed for booking.")}`)
        }
      }
    } else {
      const cachedBookings = await prisma.uplistingBookingCache.findMany({
        where: { uplisting_property_id: uplistingPropertyId },
        select: {
          uplisting_id: true,
          uplisting_property_id: true,
          check_in: true,
          check_out: true,
          guest_name: true,
          source: true,
          status: true,
          total_price: true,
          raw_payload: true,
        },
      })

      for (const cache of cachedBookings) {
        try {
          const outcome = await upsertOneCachedBooking(cache)
          if (outcome === "created") created += 1
          else if (outcome === "updated") updated += 1
          else skipped += 1
        } catch (cacheError) {
          errors.push(
            `[${cache.uplisting_id}] ${errorMessage(cacheError, "Sync failed for cached booking.")}`
          )
        }
      }

      if (cachedBookings.length === 0) {
        errors.push(BOOKINGS_ACCESS_MESSAGE)
      }
    }

    const synced = created + updated
    await finalizeSyncLog(log.id, {
      status: errors.length === 0 ? "success" : "error",
      records_synced: synced,
      error_message: errors.length ? errors.join("; ") : null,
    })

    return { synced, created, updated, skipped, errors }
  } catch (error) {
    const message = errorMessage(error, "Property bookings sync failed.")
    await finalizeSyncLog(log.id, {
      status: "error",
      records_synced: 0,
      error_message: message,
    })
    return { synced: 0, created: 0, updated: 0, skipped: 0, errors: [message] }
  }
}

export async function syncSingleBooking(
  uplistingBookingId: string
): Promise<SyncBookingsResult> {
  const errors: string[] = []
  let created = 0
  let updated = 0
  let skipped = 0

  const log = await prisma.uplistingSyncLog.create({
    data: {
      sync_type: "booking",
      status: "running",
    },
  })

  try {
    let booking: UplistingBooking | null = null
    try {
      booking = await fetchBooking(uplistingBookingId)
    } catch (error) {
      if (!isUplistingBookingsEndpointMissing(error)) throw error
    }

    if (booking) {
      try {
        const outcome = await upsertOneBooking(booking)
        if (outcome === "created") created = 1
        else if (outcome === "updated") updated = 1
        else skipped = 1
      } catch (error) {
        errors.push(errorMessage(error, "Sync failed for booking."))
      }
    } else {
      const cached = await prisma.uplistingBookingCache.findUnique({
        where: { uplisting_id: uplistingBookingId },
        select: {
          uplisting_id: true,
          uplisting_property_id: true,
          check_in: true,
          check_out: true,
          guest_name: true,
          source: true,
          status: true,
          total_price: true,
          raw_payload: true,
        },
      })
      if (!cached) {
        errors.push("Booking not found in Uplisting API or local Uplisting booking cache.")
      } else {
        const outcome = await upsertOneCachedBooking(cached)
        if (outcome === "created") created = 1
        else if (outcome === "updated") updated = 1
        else skipped = 1
      }
    }

    const synced = created + updated
    await finalizeSyncLog(log.id, {
      status: errors.length === 0 ? "success" : "error",
      records_synced: synced,
      error_message: errors.length ? errors[0] ?? null : null,
    })

    return { synced, created, updated, skipped, errors }
  } catch (error) {
    const message = errorMessage(error, "Single booking sync failed.")
    await finalizeSyncLog(log.id, {
      status: "error",
      records_synced: 0,
      error_message: message,
    })
    return { synced: 0, created: 0, updated: 0, skipped: 0, errors: [message] }
  }
}
