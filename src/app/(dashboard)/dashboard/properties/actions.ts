"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"
import {
  syncAllPropertiesFullPreserveManual,
  syncBookingsForProperty,
  syncSingleProperty,
} from "@/lib/uplisting"
import { propertySchema, type PropertyFormValues } from "@/lib/validations/property"

function normalizeOptional(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeListingUrl(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizePayload(formData: PropertyFormValues) {
  return {
    name: formData.name.trim(),
    address: formData.address.trim(),
    suburb: normalizeOptional(formData.suburb),
    city: formData.city.trim(),
    unit_number: normalizeOptional(formData.unit_number),
    building_name: normalizeOptional(formData.building_name),
    building_manager_email: normalizeOptional(formData.building_manager_email),
    building_manager_phone: normalizeOptional(formData.building_manager_phone),
    type: formData.type,
    bedrooms: formData.bedrooms,
    bathrooms: formData.bathrooms,
    parking_bays: formData.parking_bays.map((bay) => bay.trim()).filter(Boolean),
    status: formData.status,
    airbnb_listing_url: normalizeListingUrl(formData.airbnb_listing_url),
    booking_com_listing_url: normalizeListingUrl(formData.booking_com_listing_url),
    right_stay_commission_percent:
      formData.right_stay_commission_percent != null && Number.isFinite(formData.right_stay_commission_percent)
        ? formData.right_stay_commission_percent
        : null,
    welcome_pack_fee:
      formData.welcome_pack_fee != null && Number.isFinite(formData.welcome_pack_fee)
        ? formData.welcome_pack_fee
        : null,
  }
}

export async function createProperty(formData: PropertyFormValues) {
  const parsed = propertySchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid property data.")
  }

  const property = await prisma.property.create({
    data: normalizePayload(parsed.data),
  })

  redirect(`/dashboard/properties/${property.id}`)
}

export async function updateProperty(id: string, formData: PropertyFormValues) {
  const parsed = propertySchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid property data.")
  }

  await prisma.property.update({
    where: { id },
    data: normalizePayload(parsed.data),
  })

  redirect(`/dashboard/properties/${id}`)
}

export async function deleteProperty(id: string) {
  await prisma.property.delete({
    where: { id },
  })

  redirect("/dashboard/properties")
}

export async function importPropertyFromUplisting(uplistingId: string) {
  const normalizedId = uplistingId.trim()
  if (!normalizedId) {
    throw new Error("Uplisting property ID is required.")
  }

  const result = await syncSingleProperty(normalizedId)
  if (result.errors.length > 0 || result.synced === 0) {
    throw new Error(result.errors[0] ?? "Failed to sync property from Uplisting.")
  }

  const property = await prisma.property.findUnique({
    where: { uplisting_id: normalizedId },
    select: { id: true },
  })

  if (!property) {
    throw new Error("Property was synced but could not be loaded.")
  }

  redirect(`/dashboard/properties/${property.id}`)
}

export async function importAllPropertiesFromUplisting() {
  const user = await getUser()
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER")) {
    throw new Error("Unauthorized.")
  }

  const result = await syncAllPropertiesFullPreserveManual()
  revalidatePath("/dashboard/properties")
  return result
}

export async function resyncPropertyFromUplisting(propertyId: string) {
  const row = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { uplisting_id: true },
  })

  const uplistingId = row?.uplisting_id?.trim()
  if (!uplistingId) {
    throw new Error("This property is not linked to Uplisting (missing uplisting_id).")
  }

  const result = await syncSingleProperty(uplistingId)
  if (result.errors.length > 0 || result.synced === 0) {
    throw new Error(result.errors[0] ?? "Failed to sync property from Uplisting.")
  }

  const bookingsResult = await syncBookingsForProperty(uplistingId)
  const bookingWarning =
    bookingsResult.errors.length > 0
      ? bookingsResult.errors[0] ?? "Property synced, but some bookings could not be synced."
      : null

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true as const, bookingWarning }
}
