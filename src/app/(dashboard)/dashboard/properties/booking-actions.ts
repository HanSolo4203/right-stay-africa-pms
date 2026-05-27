"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getUser } from "@/lib/auth/get-user"
import { serializeStatementBookingRow } from "@/lib/clients/statement-booking-ui"
import { defaultChannelNameForSource } from "@/lib/booking-source-label"
import { prisma } from "@/lib/prisma"
import { statementBookingSelect } from "@/lib/statement-calculator"
import type { ClientStatementBookingRow } from "@/types/statement"
import {
  createManualBookingSchema,
  nightlyRateFromStay,
  type CreateManualBookingFormInput,
} from "@/lib/validations/manual-booking"

function d(n: number): Prisma.Decimal {
  return new Prisma.Decimal(Number.isFinite(n) ? String(n) : "0")
}

function revalidateBookingPaths(propertyId: string) {
  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/clients/statements")
  revalidatePath(`/properties/${propertyId}/statements`)
}

export async function updateBookingManualFields(
  propertyId: string,
  bookingId: string,
  data: { nightly_rate: string; notes: string | null }
) {
  const user = await getUser()
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER")) {
    throw new Error("Unauthorized.")
  }

  const rate = Number.parseFloat(data.nightly_rate)
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error("Invalid nightly rate.")
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, property_id: propertyId },
    select: { id: true },
  })
  if (!booking) {
    throw new Error("Booking not found.")
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      nightly_rate: new Prisma.Decimal(rate),
      notes: data.notes,
    },
  })

  revalidateBookingPaths(propertyId)
}

export async function createManualBooking(
  propertyId: string,
  raw: Omit<CreateManualBookingFormInput, "propertyId">
): Promise<{
  id: string
  check_in: string
  check_out: string
  booking: ClientStatementBookingRow
}> {
  const user = await getUser()
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER")) {
    throw new Error("Unauthorized.")
  }

  const parsed = createManualBookingSchema.safeParse({ ...raw, propertyId })
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors
    const msg =
      Object.values(first).flat()[0] ??
      parsed.error.issues[0]?.message ??
      "Invalid booking data."
    throw new Error(msg)
  }

  const data = parsed.data

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  })
  if (!property) {
    throw new Error("Property not found.")
  }

  if (data.confirmation_code) {
    const existing = await prisma.booking.findUnique({
      where: { confirmation_code: data.confirmation_code },
      select: { id: true },
    })
    if (existing) {
      throw new Error("Confirmation code is already used on another booking.")
    }
  }

  const channelName =
    data.channel_name?.trim() || defaultChannelNameForSource(data.source)
  const nightlyRate = nightlyRateFromStay(
    data.accommodation_total,
    data.check_in,
    data.check_out
  )

  const created = await prisma.booking.create({
    data: {
      property_id: propertyId,
      guest_name: data.guest_name,
      check_in: data.check_in,
      check_out: data.check_out,
      num_guests: data.num_guests,
      source: data.source,
      channel_name: channelName,
      status: data.status,
      confirmation_code: data.confirmation_code,
      reference: data.confirmation_code,
      notes: data.notes,
      nightly_rate: d(nightlyRate),
      total: d(data.total_payout),
      total_payout: d(data.total_payout),
      gross_revenue: d(data.gross_revenue),
      net_revenue: d(data.net_revenue),
      accommodation_total: d(data.accommodation_total),
      cleaning_fee: d(data.cleaning_fee),
      discount: d(data.discount),
      extra_guest_charge: d(data.extra_guest_charge),
      extra_charges: d(data.extra_charges),
      upsells: d(data.upsells),
      booking_taxes: d(data.booking_taxes),
      commission: d(data.commission),
      commission_tax: d(data.commission_tax),
      payment_processing_fee: d(data.payment_processing_fee),
      total_management_fee: d(data.total_management_fee),
      csv_imported_at: null,
      uplisting_id: null,
    },
    select: statementBookingSelect,
  })

  revalidateBookingPaths(propertyId)
  const booking = serializeStatementBookingRow(created)
  return {
    id: created.id,
    check_in: booking.check_in,
    check_out: booking.check_out,
    booking,
  }
}
