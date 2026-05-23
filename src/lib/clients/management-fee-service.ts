import "server-only"

import {
  calculateManagementFeeEarned,
  parseManagementFeeType,
  type ManagementFeeType,
} from "@/lib/clients/management-fee-calculator"
import { resolveClientPropertyIds } from "@/lib/clients/statement-service"
import { statementBookingSelect, type StatementBookingInput } from "@/lib/statement-calculator"
import { prisma } from "@/lib/prisma"
import { BookingStatus } from "@prisma/client"

const ACTIVE = [
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
] as const

export type ManagementFeePropertyConfig = {
  propertyId: string
  propertyName: string
  feeType: ManagementFeeType
  rate: number
  welcomePackFee: number
}

export type ManagementFeeSummaryRow = {
  propertyId: string
  propertyName: string
  grossRevenue: number
  feeType: ManagementFeeType
  rate: number
  feeEarned: number
  bookingCount: number
}

export async function loadManagementFeesForClient(
  clientId: string,
  month: number,
  year: number
): Promise<{
  configs: ManagementFeePropertyConfig[]
  summary: ManagementFeeSummaryRow[]
  totalFeesEarned: number
}> {
  const { propertyIds } = await resolveClientPropertyIds(clientId)
  if (propertyIds.length === 0) {
    return { configs: [], summary: [], totalFeesEarned: 0 }
  }

  const properties = await prisma.property.findMany({
    where: { id: { in: propertyIds } },
    select: {
      id: true,
      name: true,
      right_stay_commission_percent: true,
      management_fee_type: true,
      welcome_pack_fee: true,
      bookings: {
        where: { status: { in: [...ACTIVE] } },
        select: statementBookingSelect,
      },
    },
    orderBy: { name: "asc" },
  })

  const configs: ManagementFeePropertyConfig[] = properties.map((p) => ({
    propertyId: p.id,
    propertyName: p.name,
    feeType: parseManagementFeeType(p.management_fee_type),
    rate:
      p.right_stay_commission_percent != null
        ? Number(p.right_stay_commission_percent)
        : 0,
    welcomePackFee: p.welcome_pack_fee != null ? Number(p.welcome_pack_fee) : 0,
  }))

  const summary: ManagementFeeSummaryRow[] = properties.map((p) => {
    const feeType = parseManagementFeeType(p.management_fee_type)
    const rate =
      p.right_stay_commission_percent != null
        ? Number(p.right_stay_commission_percent)
        : 0
    const calc = calculateManagementFeeEarned({
      feeType,
      rate,
      bookings: p.bookings as StatementBookingInput[],
      year,
      month,
    })
    return {
      propertyId: p.id,
      propertyName: p.name,
      grossRevenue: calc.grossRevenue,
      feeType,
      rate,
      feeEarned: calc.feeEarned,
      bookingCount: calc.bookingCount,
    }
  })

  const totalFeesEarned = Math.round(
    summary.reduce((s, r) => s + r.feeEarned, 0) * 100
  ) / 100

  return { configs, summary, totalFeesEarned }
}

export async function updatePropertyManagementFee(input: {
  propertyId: string
  feeType: ManagementFeeType
  rate: number
  welcomePackFee?: number
}) {
  await prisma.property.update({
    where: { id: input.propertyId },
    data: {
      management_fee_type: input.feeType,
      right_stay_commission_percent: input.rate,
      ...(input.welcomePackFee !== undefined
        ? { welcome_pack_fee: input.welcomePackFee }
        : {}),
    },
  })
}
