"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getUser } from "@/lib/auth/get-user"
import { deleteFile } from "@/lib/supabase/storage"

const STATEMENTS_BUCKET = "documents"

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function uploadStatement(
  propertyId: string,
  month: number,
  year: number,
  filePath: string,
  fileName: string,
  notes?: string
) {
  const user = await getUser()
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER")) {
    throw new Error("Unauthorized.")
  }

  await prisma.statement.create({
    data: {
      property_id: propertyId,
      month,
      year,
      file_url: filePath,
      file_name: fileName.trim(),
      notes: normalizeOptional(notes),
    },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
}

export async function deleteStatement(id: string) {
  const user = await getUser()
  if (!user || user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized.")
  }

  const statement = await prisma.statement.findUnique({
    where: { id },
    select: { id: true, file_url: true, property_id: true },
  })

  if (!statement) {
    throw new Error("Statement not found.")
  }

  if (statement.file_url) {
    await deleteFile(STATEMENTS_BUCKET, statement.file_url)
  }

  await prisma.booking.updateMany({
    where: { owner_statement_id: id },
    data: { owner_statement_id: null },
  })

  await prisma.statement.delete({ where: { id } })

  revalidatePath(`/dashboard/properties/${statement.property_id}`)
}
