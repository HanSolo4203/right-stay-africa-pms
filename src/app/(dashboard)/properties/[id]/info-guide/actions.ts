"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { infoGuideSchema, type InfoGuideFormValues } from "@/lib/validations/info-guide"

function normalizeOptional(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizePayload(data: InfoGuideFormValues) {
  return {
    wifi_name: normalizeOptional(data.wifi_name),
    wifi_password: normalizeOptional(data.wifi_password),
    parking_instructions: normalizeOptional(data.parking_instructions),
    access_code: normalizeOptional(data.access_code),
    lockbox_code: normalizeOptional(data.lockbox_code),
    electricity_notes: normalizeOptional(data.electricity_notes),
    emergency_contacts: data.emergency_contacts.map((contact) => ({
      name: contact.name.trim(),
      phone: contact.phone.trim(),
    })),
    notes: normalizeOptional(data.notes),
  }
}

export async function saveInfoGuide(propertyId: string, data: InfoGuideFormValues) {
  const parsed = infoGuideSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid info guide data.")
  }

  await prisma.infoGuide.upsert({
    where: { property_id: propertyId },
    create: {
      property_id: propertyId,
      ...normalizePayload(parsed.data),
    },
    update: normalizePayload(parsed.data),
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
}
