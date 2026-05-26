import { bookingManagementFeeBase } from "@/lib/clients/statement-financials"
import type { ManagementFeeType } from "@/lib/clients/management-fee-calculator"

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type NormalizedBookingOverrideAmounts = {
  accommodation_total: number
  channel_commission: number
  total_management_fee: number
  cleaning_fee: number
  payment_processing_fee: number
  total_payout: number
  discount: number | null
  extra_charges: number | null
  upsells: number | null
  booking_taxes: number | null
}

/** Fill missing override fields so users can enter only gross + payout to match a paper statement. */
export function normalizeBookingOverrideAmounts(input: {
  accommodation_total?: number | null
  channel_commission?: number | null
  total_management_fee?: number | null
  cleaning_fee?: number | null
  payment_processing_fee?: number | null
  total_payout?: number | null
  discount?: number | null
  extra_charges?: number | null
  upsells?: number | null
  booking_taxes?: number | null
  commissionPercent: number | null
  managementFeeType: ManagementFeeType
}): NormalizedBookingOverrideAmounts {
  const channel_commission = round2(Math.max(0, input.channel_commission ?? 0))
  const payment_processing_fee = round2(Math.max(0, input.payment_processing_fee ?? 0))
  const cleaning_fee = round2(Math.max(0, input.cleaning_fee ?? 0))

  const grossCandidate = input.accommodation_total ?? input.total_payout
  if (grossCandidate == null || !Number.isFinite(grossCandidate)) {
    throw new Error("Enter gross income or payout for this month.")
  }
  const accommodation_total = round2(Math.max(0, grossCandidate))
  const total_payout = round2(Math.max(0, input.total_payout ?? accommodation_total))

  const bookingFees = round2(channel_commission + payment_processing_fee)
  const feeBase = bookingManagementFeeBase(accommodation_total, bookingFees)
  const rate = Math.max(0, input.commissionPercent ?? 0)

  let total_management_fee = input.total_management_fee
  if (total_management_fee == null || !Number.isFinite(total_management_fee)) {
    if (input.managementFeeType === "fixed_per_booking") {
      total_management_fee = rate
    } else if (input.managementFeeType === "fixed_monthly") {
      total_management_fee = rate
    } else {
      total_management_fee = round2((feeBase * rate) / 100)
    }
  }
  total_management_fee = round2(Math.max(0, total_management_fee))

  return {
    accommodation_total,
    channel_commission,
    total_management_fee,
    cleaning_fee,
    payment_processing_fee,
    total_payout,
    discount: input.discount ?? null,
    extra_charges: input.extra_charges ?? null,
    upsells: input.upsells ?? null,
    booking_taxes: input.booking_taxes ?? null,
  }
}
