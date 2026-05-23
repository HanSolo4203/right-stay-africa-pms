import type { ManagementFeeType } from "@/lib/clients/management-fee-calculator"
import type { StatementBookingInput } from "@/lib/statement-calculator"
import type { StatementExpenseItem } from "@/types/statement"

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function num(v: { toString: () => string } | null | undefined): number {
  if (v == null) return 0
  const n = Number(v.toString())
  return Number.isFinite(n) ? n : 0
}

/** CSV gross_revenue when present; otherwise Uplisting-style revenue components. */
export function bookingGrossFromInput(b: StatementBookingInput): number {
  return bookingGrossFromSnapshot({
    gross_revenue: num(b.gross_revenue),
    accommodation_total: num(b.accommodation_total),
    extra_guest_charge: num(b.extra_guest_charge),
    cleaning_fee: num(b.cleaning_fee),
    extra_charges: num(b.extra_charges),
    upsells: num(b.upsells),
    booking_taxes: num(b.booking_taxes),
  })
}

/** Persisted snapshot row — same gross rules as {@link bookingGrossFromInput}. */
export function bookingGrossFromSnapshot(b: {
  gross_revenue?: number | null
  accommodation_total: number
  extra_guest_charge: number
  cleaning_fee: number
  extra_charges: number
  upsells: number
  booking_taxes: number
}): number {
  const gross = b.gross_revenue ?? 0
  if (gross > 0) return round2(gross)
  return bookingRevenueFromComponents({
    accommodation_total: b.accommodation_total,
    extra_guest_charge: b.extra_guest_charge,
    cleaning_fee: b.cleaning_fee,
    extra_charges: b.extra_charges,
    upsells: b.upsells,
    booking_taxes: b.booking_taxes,
  })
}

/** Revenue components for display; discount is not subtracted (already in CSV total_payout). */
export function bookingRevenueFromComponents(parts: {
  accommodation_total: number
  extra_guest_charge: number
  cleaning_fee: number
  extra_charges: number
  upsells: number
  booking_taxes: number
}): number {
  return round2(
    parts.accommodation_total +
      parts.extra_guest_charge +
      parts.cleaning_fee +
      parts.extra_charges +
      parts.upsells +
      parts.booking_taxes
  )
}

export function bookingFeesFromRow(row: {
  channel_commission: number
  payment_processing_fee: number
}): number {
  return round2(row.channel_commission + row.payment_processing_fee)
}

/** Base for percentage fee: revenue minus booking fees (channel + processing). */
export function bookingManagementFeeBase(revenue: number, bookingFees: number): number {
  return round2(Math.max(0, revenue - bookingFees))
}

/** Per-booking Right Stay fee: CSV import when present, else % of (revenue − booking fees). */
export function bookingManagementFeeAmount(input: {
  revenue: number
  bookingFees: number
  csvManagementFee: number
  feeType: ManagementFeeType
  rate: number
  bookingCount: number
}): number {
  const rate = Math.max(0, input.rate)
  switch (input.feeType) {
    case "fixed_per_booking":
      if (input.csvManagementFee > 0) return round2(input.csvManagementFee)
      return round2(rate)
    case "fixed_monthly":
      if (input.csvManagementFee > 0) return round2(input.csvManagementFee)
      return input.bookingCount > 0 ? round2(rate / input.bookingCount) : 0
    case "percentage":
    default:
      if (input.csvManagementFee > 0) return round2(input.csvManagementFee)
      return round2((bookingManagementFeeBase(input.revenue, input.bookingFees) * rate) / 100)
  }
}

export function buildCleaningFeeExpenseLines(
  bookings: Array<{ id: string; guestName: string; cleaningFee: number }>
): StatementExpenseItem[] {
  return bookings
    .filter((b) => b.cleaningFee > 0)
    .map((b) => {
      const fee = round2(b.cleaningFee)
      return {
        id: `cleaning:${b.id}`,
        description: `Cleaning fee — ${b.guestName}`,
        qty: 1,
        unitPrice: fee,
        total: fee,
        isAutomatic: true,
      }
    })
}

export function buildWelcomePackExpenseLines(
  bookings: Array<{ id: string; guestName: string }>,
  feePerBooking: number
): StatementExpenseItem[] {
  const fee = round2(feePerBooking)
  if (fee <= 0) return []
  return bookings.map((b) => ({
    id: `welcome-pack:${b.id}`,
    description: `Welcome pack — ${b.guestName}`,
    qty: 1,
    unitPrice: fee,
    total: fee,
    isAutomatic: true,
  }))
}

/** Per-booking payout before property-level expenses (cleaning is in expenses section). */
export function computeLineNetToOwner(input: {
  grossRevenue: number
  totalPayout: number
  bookingFees: number
  managementFeeAmount: number
  welcomePackFee: number
}): number {
  if (input.totalPayout > 0) {
    return round2(
      input.totalPayout - input.managementFeeAmount - input.welcomePackFee
    )
  }
  return round2(
    input.grossRevenue -
      input.bookingFees -
      input.managementFeeAmount -
      input.welcomePackFee
  )
}

/**
 * Owner payout: revenue − booking fees − management fees − expenses.
 * Guest discounts are informational (already netted in CSV payouts).
 */
export function computeOwnerPayout(input: {
  totalBookingsPayout: number
  grossRevenue: number
  totalBookingFees: number
  totalManagementFees: number
  totalExpenses: number
}): number {
  if (input.grossRevenue > 0) {
    return round2(
      input.grossRevenue -
        input.totalBookingFees -
        input.totalManagementFees -
        input.totalExpenses
    )
  }
  if (input.totalBookingsPayout > 0) {
    return round2(
      input.totalBookingsPayout -
        input.totalManagementFees -
        input.totalExpenses
    )
  }
  return 0
}

export function sumExpenseItems(items: StatementExpenseItem[]): number {
  return round2(items.reduce((s, e) => s + e.total, 0))
}
