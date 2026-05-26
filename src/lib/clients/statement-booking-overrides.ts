import type { StatementBookingOverride } from "@prisma/client"
import type { MonthlyAllocation, StatementBookingOverrideRow } from "@/types/statement"

function num(v: { toString: () => string } | null | undefined): number | null {
  if (v == null) return null
  const n = Number(v.toString())
  return Number.isFinite(n) ? n : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export type { StatementBookingOverrideRow } from "@/types/statement"

export function serializeStatementBookingOverride(
  row: StatementBookingOverride
): StatementBookingOverrideRow {
  return {
    id: row.id,
    booking_id: row.booking_id,
    property_id: row.property_id,
    month: row.month,
    year: row.year,
    note: row.note,
    accommodation_total: num(row.accommodation_total),
    discount: num(row.discount),
    extra_charges: num(row.extra_charges),
    cleaning_fee: num(row.cleaning_fee),
    upsells: num(row.upsells),
    booking_taxes: num(row.booking_taxes),
    channel_commission: num(row.channel_commission),
    total_management_fee: num(row.total_management_fee),
    payment_processing_fee: num(row.payment_processing_fee),
    total_payout: num(row.total_payout),
  }
}

export function applyOverridesToAllocations(
  allocations: MonthlyAllocation[],
  overrides: StatementBookingOverrideRow[],
  month: number,
  year: number
): MonthlyAllocation[] {
  return allocations.map((allocation) => {
    const override = overrides.find(
      (o) =>
        o.booking_id === allocation.booking.id && o.month === month && o.year === year
    )
    if (!override) return allocation
    return mergeOverrideIntoAllocation(allocation, override)
  })
}

function mergeOverrideIntoAllocation(
  allocation: MonthlyAllocation,
  override: StatementBookingOverrideRow
): MonthlyAllocation {
  const accommodation_total =
    override.accommodation_total ?? allocation.accommodation_total
  const discount = override.discount ?? allocation.discount
  const extra_charges = override.extra_charges ?? allocation.extra_charges
  const cleaning_fee = override.cleaning_fee ?? allocation.cleaning_fee
  const upsells = override.upsells ?? allocation.upsells
  const booking_taxes = override.booking_taxes ?? allocation.booking_taxes
  const channel_commission = override.channel_commission ?? allocation.channel_commission
  const total_management_fee = override.total_management_fee ?? allocation.total_management_fee
  const payment_processing_fee =
    override.payment_processing_fee ?? allocation.payment_processing_fee
  const total_payout = override.total_payout ?? allocation.total_payout
  // Override `accommodation_total` is gross income for the month (see override dialog /
  // normalizeBookingOverrideAmounts), not Uplisting accommodation — cleaning is expensed separately.
  const gross_revenue = round2(accommodation_total)

  return {
    ...allocation,
    isManualOverride: true,
    manualNote: override.note,
    overrideId: override.id,
    accommodation_total: round2(accommodation_total),
    discount: round2(discount),
    extra_charges: round2(extra_charges),
    cleaning_fee: round2(cleaning_fee),
    upsells: round2(upsells),
    booking_taxes: round2(booking_taxes),
    channel_commission: round2(channel_commission),
    total_management_fee: round2(total_management_fee),
    payment_processing_fee: round2(payment_processing_fee),
    total_payout: round2(total_payout),
    gross_revenue: round2(gross_revenue),
  }
}
