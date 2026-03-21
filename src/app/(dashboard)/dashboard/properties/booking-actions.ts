"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

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

  revalidatePath(`/dashboard/properties/${propertyId}`)
}
