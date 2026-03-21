"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getUser } from "@/lib/auth/get-user"
import { type ReceiptActionInput } from "@/lib/types/receipt"
import { deleteFile } from "@/lib/supabase/storage"

const RECEIPTS_BUCKET = "documents"

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function ensureManagerRole(role: string | null | undefined) {
  if (role !== "SUPER_ADMIN" && role !== "PROPERTY_MANAGER") {
    throw new Error("Unauthorized.")
  }
}

export async function createReceipt(
  propertyId: string,
  data: ReceiptActionInput,
  filePath?: string,
  fileName?: string
) {
  const user = await getUser()
  ensureManagerRole(user?.role)

  await prisma.receipt.create({
    data: {
      property_id: propertyId,
      date: new Date(data.date),
      supplier: data.supplier.trim(),
      amount: data.amount,
      category: data.category,
      notes: normalizeOptional(data.notes),
      file_url: normalizeOptional(filePath ?? data.file_url),
      file_name: normalizeOptional(fileName ?? data.file_name),
    },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
}

export async function updateReceipt(id: string, data: ReceiptActionInput) {
  const user = await getUser()
  ensureManagerRole(user?.role)

  const existing = await prisma.receipt.findUnique({
    where: { id },
    select: { property_id: true, file_url: true },
  })

  if (!existing) {
    throw new Error("Receipt not found.")
  }

  const nextFileUrl = normalizeOptional(data.file_url)
  if (existing.file_url && existing.file_url !== nextFileUrl) {
    await deleteFile(RECEIPTS_BUCKET, existing.file_url)
  }

  await prisma.receipt.update({
    where: { id },
    data: {
      date: new Date(data.date),
      supplier: data.supplier.trim(),
      amount: data.amount,
      category: data.category,
      notes: normalizeOptional(data.notes),
      file_url: nextFileUrl,
      file_name: normalizeOptional(data.file_name),
    },
  })

  revalidatePath(`/dashboard/properties/${existing.property_id}`)
}

export async function deleteReceipt(id: string) {
  const user = await getUser()
  ensureManagerRole(user?.role)

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    select: { id: true, file_url: true, property_id: true },
  })

  if (!receipt) {
    throw new Error("Receipt not found.")
  }

  if (receipt.file_url) {
    await deleteFile(RECEIPTS_BUCKET, receipt.file_url)
  }

  await prisma.receipt.delete({ where: { id } })
  revalidatePath(`/dashboard/properties/${receipt.property_id}`)
}
