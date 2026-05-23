"use server"

import { revalidatePath } from "next/cache"
import { syncOwnerToClient } from "@/lib/clients/sync-owner-to-client"
import { prisma } from "@/lib/prisma"
import { ownerSchema, type OwnerFormValues } from "@/lib/validations/owner"

function normalizeOptional(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizePayload(data: OwnerFormValues) {
  return {
    full_name: data.full_name.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    id_number: normalizeOptional(data.id_number),
    bank_name: normalizeOptional(data.bank_name),
    account_number: normalizeOptional(data.account_number),
    branch_code: normalizeOptional(data.branch_code),
    notes: normalizeOptional(data.notes),
  }
}

export async function saveOwner(propertyId: string, data: OwnerFormValues) {
  const parsed = ownerSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid owner data.")
  }

  await prisma.owner.upsert({
    where: { property_id: propertyId },
    create: {
      property_id: propertyId,
      ...normalizePayload(parsed.data),
    },
    update: normalizePayload(parsed.data),
  })

  await syncOwnerToClient(propertyId)

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/dashboard/owners")
  revalidatePath("/clients")
  revalidatePath("/clients/statements")
  revalidatePath("/clients/management-fees")
  revalidatePath("/clients/account-details")
}

export async function deleteOwner(propertyId: string) {
  await prisma.owner.deleteMany({
    where: { property_id: propertyId },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/dashboard/owners")
}
