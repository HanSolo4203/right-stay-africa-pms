import { getDaysInMonth } from "date-fns"
import type { BookingSource, BookingStatus } from "@prisma/client"
import { getAnalyticsChannelLabel } from "@/lib/booking-channel-label"
import { isStatementActiveBookingStatus } from "@/lib/booking-status"
import type { ManagementFeeType } from "@/lib/clients/management-fee-calculator"
import {
  bookingFeesFromRow,
  bookingGrossFromInput,
  bookingManagementFeeAmount,
  buildCleaningFeeExpenseLines,
  buildWelcomePackExpenseLines,
  computeLineNetToOwner,
  computeOwnerPayout,
  sumExpenseItems,
} from "@/lib/clients/statement-financials"
import { checkInAllowedOnOwnerStatement } from "@/lib/owner-statement/statement-eligibility"
import type { OwnerStatementSnapshotBookingV1 } from "@/lib/owner-statement/types"
import type {
  PropertyStatement,
  PropertyStatementTotals,
  StatementExpenseItem,
  StatementLine,
} from "@/types/statement"

export const statementBookingSelect = {
  id: true,
  guest_name: true,
  check_in: true,
  check_out: true,
  channel_name: true,
  source: true,
  status: true,
  owner_statement_id: true,
  csv_imported_at: true,
  accommodation_total: true,
  discount: true,
  extra_guest_charge: true,
  cleaning_fee: true,
  extra_charges: true,
  upsells: true,
  booking_taxes: true,
  commission: true,
  commission_tax: true,
  total_management_fee: true,
  payment_processing_fee: true,
  total_payout: true,
  gross_revenue: true,
} as const


export type StatementBookingInput = {
  id: string
  guest_name: string
  check_in: Date
  check_out: Date
  channel_name: string | null
  source: BookingSource
  status: BookingStatus
  owner_statement_id: string | null
  csv_imported_at?: Date | null
  accommodation_total: { toString: () => string } | null
  discount: { toString: () => string } | null
  extra_guest_charge: { toString: () => string } | null
  cleaning_fee: { toString: () => string } | null
  extra_charges: { toString: () => string } | null
  upsells: { toString: () => string } | null
  booking_taxes: { toString: () => string } | null
  commission: { toString: () => string } | null
  commission_tax: { toString: () => string } | null
  total_management_fee: { toString: () => string } | null
  payment_processing_fee: { toString: () => string } | null
  total_payout: { toString: () => string } | null
  gross_revenue: { toString: () => string } | null
}

function num(v: { toString: () => string } | null | undefined): number {
  if (v == null) return 0
  const n = Number(v.toString())
  return Number.isFinite(n) ? n : 0
}

export function filterBookingsForStatementMonth(
  bookings: StatementBookingInput[],
  year: number,
  month: number,
  options?: { includeAlreadyOnStatement?: boolean }
): StatementBookingInput[] {
  const includeOnStatement = options?.includeAlreadyOnStatement ?? false
  return bookings.filter((b) => {
    if (!isStatementActiveBookingStatus(b.status)) return false
    if (!includeOnStatement && b.owner_statement_id != null) return false
    return checkInAllowedOnOwnerStatement(b.check_in, year, month)
  })
}

export function bookingToSnapshotRow(b: StatementBookingInput): OwnerStatementSnapshotBookingV1 {
  const numNights = Math.max(
    0,
    Math.round((b.check_out.getTime() - b.check_in.getTime()) / (1000 * 60 * 60 * 24))
  )
  const commission = num(b.commission)
  const commissionTax = num(b.commission_tax)
  return {
    id: b.id,
    guest_name: b.guest_name,
    check_in: b.check_in.toISOString(),
    check_out: b.check_out.toISOString(),
    num_nights: numNights,
    channel_label: getAnalyticsChannelLabel(b.channel_name, b.source),
    accommodation_total: num(b.accommodation_total),
    gross_revenue: num(b.gross_revenue) > 0 ? num(b.gross_revenue) : undefined,
    discount: num(b.discount),
    extra_guest_charge: num(b.extra_guest_charge),
    cleaning_fee: num(b.cleaning_fee),
    extra_charges: num(b.extra_charges),
    upsells: num(b.upsells),
    booking_taxes: num(b.booking_taxes),
    channel_commission: commission + commissionTax,
    total_management_fee: num(b.total_management_fee),
    payment_processing_fee: num(b.payment_processing_fee),
    total_payout: num(b.total_payout),
  }
}

export { computeLineNetToOwner } from "@/lib/clients/statement-financials"

export function buildPropertyStatement(input: {
  propertyId: string
  propertyName: string
  month: number
  year: number
  commissionPercentProperty: number | null
  managementFeeType?: ManagementFeeType
  welcomePackFeePerBooking?: number
  bookings: StatementBookingInput[]
  manualExpenses?: StatementExpenseItem[]
  existingStatementId?: string | null
  existingStatementStatus?: "DRAFT" | "FINAL" | null
  hasPdf?: boolean
  isVirtualClient?: boolean
}): PropertyStatement {
  const eligible = filterBookingsForStatementMonth(input.bookings, input.year, input.month, {
    includeAlreadyOnStatement: true,
  })
  const feeType = input.managementFeeType ?? "percentage"
  const rate = input.commissionPercentProperty ?? 0
  const welcomePackUnit = round2(input.welcomePackFeePerBooking ?? 0)
  const bookingCount = eligible.length

  const cleaningExpenseLines = buildCleaningFeeExpenseLines(
    eligible.map((b) => ({
      id: b.id,
      guestName: b.guest_name,
      cleaningFee: num(b.cleaning_fee),
    }))
  )
  const welcomePackExpenseLines = buildWelcomePackExpenseLines(
    eligible.map((b) => ({ id: b.id, guestName: b.guest_name })),
    welcomePackUnit
  )
  const automaticExpenses = [...cleaningExpenseLines, ...welcomePackExpenseLines]
  const manualExpenses = input.manualExpenses ?? []
  const manualExpensesTotal = sumExpenseItems(manualExpenses)
  const totalWelcomePackFees = sumExpenseItems(welcomePackExpenseLines)
  const totalCleaningInExpenses = sumExpenseItems(cleaningExpenseLines)
  const additionalExpensesTotal = round2(
    manualExpensesTotal + totalWelcomePackFees + totalCleaningInExpenses
  )

  const daysInMonth = getDaysInMonth(new Date(input.year, input.month - 1, 1))
  let totalNights = 0
  let grossRevenue = 0
  let totalDiscount = 0
  let totalPlatformFees = 0
  let totalPaymentProcessingFees = 0
  let totalCleaningFees = 0
  let totalManagementFees = 0
  let totalBookingsPayout = 0

  const lines: StatementLine[] = eligible.map((b) => {
    const row = bookingToSnapshotRow(b)
    const nights = row.num_nights
    totalNights += nights
    const gross = bookingGrossFromInput(b)
    grossRevenue += gross
    totalDiscount += row.discount
    totalPlatformFees += row.channel_commission
    totalPaymentProcessingFees += row.payment_processing_fee
    totalCleaningFees += row.cleaning_fee
    totalBookingsPayout += row.total_payout
    const bookingFees = bookingFeesFromRow(row)
    const mgmtAmount = bookingManagementFeeAmount({
      revenue: gross,
      bookingFees,
      csvManagementFee: row.total_management_fee,
      feeType,
      rate,
      bookingCount,
    })
    totalManagementFees += mgmtAmount

    return {
      bookingId: b.id,
      guestName: b.guest_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights,
      platform: row.channel_label,
      grossRevenue: gross,
      discount: row.discount,
      bookingFees,
      bookingPayout: row.total_payout,
      platformFee: row.channel_commission,
      paymentProcessingFee: row.payment_processing_fee,
      cleaningFee: row.cleaning_fee,
      welcomePackFee: welcomePackUnit,
      managementFeePercent: input.commissionPercentProperty,
      managementFeeAmount: mgmtAmount,
      netToOwner: computeLineNetToOwner({
        grossRevenue: gross,
        totalPayout: row.total_payout,
        bookingFees,
        managementFeeAmount: mgmtAmount,
        welcomePackFee: welcomePackUnit,
      }),
    }
  })

  const totalBookingFees = round2(totalPlatformFees + totalPaymentProcessingFees)
  const netToOwner = computeOwnerPayout({
    totalBookingsPayout: round2(totalBookingsPayout),
    grossRevenue: round2(grossRevenue),
    totalBookingFees,
    totalManagementFees: round2(totalManagementFees),
    totalExpenses: additionalExpensesTotal,
  })

  const allExpenses = [...automaticExpenses, ...manualExpenses]

  const totals: PropertyStatementTotals = {
    grossRevenue: round2(grossRevenue),
    totalDiscount: round2(totalDiscount),
    totalBookingFees,
    totalPlatformFees: round2(totalPlatformFees),
    totalPaymentProcessingFees: round2(totalPaymentProcessingFees),
    totalCleaningFees: round2(totalCleaningFees),
    totalWelcomePackFees,
    totalManagementFees: round2(totalManagementFees),
    totalBookingsPayout: round2(totalBookingsPayout),
    manualExpensesTotal,
    additionalExpensesTotal,
    netToOwner,
    occupancyRate: daysInMonth > 0 ? round2(totalNights / daysInMonth) : 0,
    totalNights,
    bookingCount: lines.length,
  }

  return {
    propertyId: input.propertyId,
    propertyName: input.propertyName,
    month: input.month,
    year: input.year,
    bookings: [],
    lines,
    totals,
    manualExpenses,
    automaticExpenses,
    additionalExpenses: allExpenses,
    managementFeePercent: input.commissionPercentProperty,
    managementFeeType: feeType,
    welcomePackFeePerBooking: welcomePackUnit,
    existingStatementId: input.existingStatementId ?? null,
    existingStatementStatus: input.existingStatementStatus ?? null,
    hasPdf: input.hasPdf ?? false,
    existingStatementFileUrl: null,
    existingStatementFileName: null,
    isVirtualClient: input.isVirtualClient ?? false,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Bookings that may be selected on a statement for this period: active status,
 * check-in in statement month or prior month (carry-in), and not on a different statement.
 * Rows already on `existingStatementId` stay eligible when updating a draft or final PDF.
 */
export function filterBookingsEligibleForStatement(
  bookings: StatementBookingInput[],
  year: number,
  month: number,
  existingStatementId?: string | null
): StatementBookingInput[] {
  const onThisStatement = existingStatementId ?? null
  return bookings.filter((b) => {
    if (!isStatementActiveBookingStatus(b.status)) return false
    if (!checkInAllowedOnOwnerStatement(b.check_in, year, month)) return false
    if (b.owner_statement_id != null && b.owner_statement_id !== onThisStatement) return false
    return true
  })
}

export function bookingIdsEligibleForStatementSelection(
  bookings: StatementBookingInput[],
  year: number,
  month: number,
  existingStatementId?: string | null
): string[] {
  return filterBookingsEligibleForStatement(bookings, year, month, existingStatementId).map(
    (b) => b.id
  )
}

/** Bookings eligible for auto-generate (unpaid only, active, check-in rules). */
export function selectBookingIdsForAutoGenerate(
  bookings: StatementBookingInput[],
  year: number,
  month: number
): string[] {
  return filterBookingsForStatementMonth(bookings, year, month).map((b) => b.id)
}
