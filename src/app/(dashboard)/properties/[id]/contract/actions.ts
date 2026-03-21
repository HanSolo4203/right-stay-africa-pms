"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getUser } from "@/lib/auth/get-user"

type UploadContractData = {
  startDate: string
  endDate: string | null
  commissionRate: string
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function uploadContract(
  propertyId: string,
  data: UploadContractData,
  filePath: string,
  fileName: string
) {
  const user = await getUser()
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER")) {
    throw new Error("Unauthorized.")
  }

  const commissionRate = data.commissionRate.trim()
  if (!commissionRate) {
    throw new Error("Commission rate is required.")
  }

  const startDate = new Date(data.startDate)
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Valid start date is required.")
  }

  const endDate = data.endDate ? new Date(data.endDate) : null
  if (data.endDate && Number.isNaN(endDate?.getTime() ?? NaN)) {
    throw new Error("Invalid end date.")
  }

  if (endDate && endDate < startDate) {
    throw new Error("End date cannot be before start date.")
  }

  const contract = await prisma.$transaction(async (tx) => {
    const latest = await tx.contract.findFirst({
      where: { property_id: propertyId },
      orderBy: [{ version: "desc" }, { created_at: "desc" }],
      select: { version: true },
    })

    await tx.contract.updateMany({
      where: { property_id: propertyId, is_current: true },
      data: { is_current: false },
    })

    return tx.contract.create({
      data: {
        property_id: propertyId,
        file_url: filePath,
        file_name: fileName.trim(),
        start_date: startDate,
        end_date: endDate,
        commission_rate: commissionRate,
        version: (latest?.version ?? 0) + 1,
        is_current: true,
      },
    })
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return {
    ...contract,
    commission_rate: normalizeOptional(contract.commission_rate) ?? contract.commission_rate,
  }
}
