import { differenceInDays } from "date-fns"
import { getDaysInMonth } from "date-fns"
import type { BookingSource, BookingStatus } from "@prisma/client"
import { getAnalyticsChannelLabel } from "@/lib/booking-channel-label"
import { isStatementActiveBookingStatus } from "@/lib/booking-status"
import type { ManagementFeeType } from "@/lib/clients/management-fee-calculator"
import {
  bookingFeesFromRow,
  bookingGrossFromSnapshot,
  bookingManagementFeeAmount,
  buildCleaningFeeExpenseLines,
  buildWelcomePackExpenseLines,
  computeLineNetToOwner,
  computeOwnerPayout,
  sumExpenseItems,
} from "@/lib/clients/statement-financials"
import {
  bookingHasNightsInCalendarMonth,
  calendarYearMonthInTimeZone,
  nightsByCalendarMonth,
  STATEMENT_CALENDAR_TIMEZONE,
} from "@/lib/owner-statement/statement-eligibility"
import type { OwnerStatementSnapshotBookingV1 } from "@/lib/owner-statement/types"
import type {
  MonthlyAllocation,
  PropertyStatement,
  PropertyStatementTotals,
  StatementBookingOverrideRow,
  StatementExpenseItem,
  StatementLine,
} from "@/types/statement"
import { applyOverridesToAllocations } from "@/lib/clients/statement-booking-overrides"

export const statementBookingSelect = {
  id: true,
  guest_name: true,
  check_in: true,
  check_out: true,
  channel_name: true,
  source: true,
  status: true,
  owner_statement_id: true,
  uplisting_id: true,
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
  is_manual_override: true,
  manual_monthly_note: true,
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
  is_manual_override?: boolean
  manual_monthly_note?: string | null
}

function num(v: { toString: () => string } | null | undefined): number {
  if (v == null) return 0
  const n = Number(v.toString())
  return Number.isFinite(n) ? n : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

type BookingFinancials = {
  accommodation_total: number
  discount: number
  extra_guest_charge: number
  extra_charges: number
  cleaning_fee: number
  upsells: number
  booking_taxes: number
  channel_commission: number
  total_management_fee: number
  payment_processing_fee: number
  total_payout: number
  gross_revenue: number
}

export function bookingFinancialsFromInput(b: StatementBookingInput): BookingFinancials {
  return {
    accommodation_total: num(b.accommodation_total),
    discount: num(b.discount),
    extra_guest_charge: num(b.extra_guest_charge),
    extra_charges: num(b.extra_charges),
    cleaning_fee: num(b.cleaning_fee),
    upsells: num(b.upsells),
    booking_taxes: num(b.booking_taxes),
    channel_commission: round2(num(b.commission) + num(b.commission_tax)),
    total_management_fee: num(b.total_management_fee),
    payment_processing_fee: num(b.payment_processing_fee),
    total_payout: num(b.total_payout),
    gross_revenue: num(b.gross_revenue),
  }
}

function prorateField(total: number, ratio: number): number {
  return round2(total * ratio)
}

function applyRatioToFinancials(f: BookingFinancials, ratio: number): BookingFinancials {
  return {
    accommodation_total: prorateField(f.accommodation_total, ratio),
    discount: prorateField(f.discount, ratio),
    extra_guest_charge: prorateField(f.extra_guest_charge, ratio),
    extra_charges: prorateField(f.extra_charges, ratio),
    cleaning_fee: prorateField(f.cleaning_fee, ratio),
    upsells: prorateField(f.upsells, ratio),
    booking_taxes: prorateField(f.booking_taxes, ratio),
    channel_commission: prorateField(f.channel_commission, ratio),
    total_management_fee: prorateField(f.total_management_fee, ratio),
    payment_processing_fee: prorateField(f.payment_processing_fee, ratio),
    total_payout: prorateField(f.total_payout, ratio),
    gross_revenue: prorateField(f.gross_revenue, ratio),
  }
}

/**
 * Given a booking that spans multiple months, returns an array of monthly
 * allocations — one entry per calendar month the booking touches — each
 * containing the pro-rated share of every financial field for that month.
 *
 * For single-month bookings, returns a single entry (no change to existing
 * behaviour). Manual overrides attribute the full booking to checkout month.
 */
export function prorateBookingByMonth(booking: StatementBookingInput): MonthlyAllocation[] {
  const checkIn = booking.check_in
  const checkOut = booking.check_out
  const totalNights = differenceInDays(checkOut, checkIn)

  if (totalNights <= 0) return []

  const financials = bookingFinancialsFromInput(booking)

  if (booking.is_manual_override) {
    const { year, month } = calendarYearMonthInTimeZone(checkOut, STATEMENT_CALENDAR_TIMEZONE)
    return [
      {
        year,
        month,
        nights: totalNights,
        totalNights,
        ratio: 1,
        isProrated: false,
        ...financials,
        booking,
      },
    ]
  }

  const months = nightsByCalendarMonth(checkIn, checkOut)
  if (months.length === 0) return []

  const isProrated = months.length > 1

  return months.map(({ year, month, nights }, index) => {
    const ratio = nights / totalNights
    const prorated =
      index === months.length - 1
        ? subtractAllocatedFinancials(financials, months.slice(0, -1), totalNights)
        : applyRatioToFinancials(financials, ratio)

    return {
      year,
      month,
      nights,
      totalNights,
      ratio,
      isProrated,
      ...prorated,
      booking,
    }
  })
}

/** Last month slice absorbs rounding remainder so field totals match the booking. */
function subtractAllocatedFinancials(
  total: BookingFinancials,
  priorMonths: Array<{ nights: number }>,
  totalNights: number
): BookingFinancials {
  const prior = priorMonths.map(({ nights }) =>
    applyRatioToFinancials(total, nights / totalNights)
  )
  const sumField = (key: keyof BookingFinancials) =>
    round2(total[key] - prior.reduce((s, p) => s + p[key], 0))

  return {
    accommodation_total: sumField("accommodation_total"),
    discount: sumField("discount"),
    extra_guest_charge: sumField("extra_guest_charge"),
    extra_charges: sumField("extra_charges"),
    cleaning_fee: sumField("cleaning_fee"),
    upsells: sumField("upsells"),
    booking_taxes: sumField("booking_taxes"),
    channel_commission: sumField("channel_commission"),
    total_management_fee: sumField("total_management_fee"),
    payment_processing_fee: sumField("payment_processing_fee"),
    total_payout: sumField("total_payout"),
    gross_revenue: sumField("gross_revenue"),
  }
}

export function allocationsForStatementMonth(
  bookings: StatementBookingInput[],
  year: number,
  month: number,
  overrides: StatementBookingOverrideRow[] = []
): MonthlyAllocation[] {
  const base = bookings
    .flatMap((b) => prorateBookingByMonth(b))
    .filter((a) => a.year === year && a.month === month)
  return applyOverridesToAllocations(base, overrides, month, year)
}

/** Apply persisted overrides on top of automatic pro-ration. */
export function getAllocationsWithOverrides(
  bookings: StatementBookingInput[],
  month: number,
  year: number,
  overrides: StatementBookingOverrideRow[]
): MonthlyAllocation[] {
  return allocationsForStatementMonth(bookings, year, month, overrides)
}

export function allocationGrossRevenue(a: MonthlyAllocation): number {
  if (a.gross_revenue > 0) return a.gross_revenue
  return bookingGrossFromSnapshot({
    gross_revenue: a.gross_revenue,
    accommodation_total: a.accommodation_total,
    extra_guest_charge: a.extra_guest_charge,
    cleaning_fee: a.cleaning_fee,
    extra_charges: a.extra_charges,
    upsells: a.upsells,
    booking_taxes: a.booking_taxes,
  })
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
    return bookingHasNightsInCalendarMonth(b.check_in, b.check_out, year, month)
  })
}

export function bookingToSnapshotRow(
  b: StatementBookingInput,
  allocation?: MonthlyAllocation
): OwnerStatementSnapshotBookingV1 {
  if (allocation) {
    const commission = allocation.channel_commission
    return {
      id: b.id,
      guest_name: b.guest_name,
      check_in: b.check_in.toISOString(),
      check_out: b.check_out.toISOString(),
      num_nights: allocation.nights,
      channel_label: getAnalyticsChannelLabel(b.channel_name, b.source),
      accommodation_total: allocation.accommodation_total,
      gross_revenue: allocation.gross_revenue > 0 ? allocation.gross_revenue : undefined,
      discount: allocation.discount,
      extra_guest_charge: allocation.extra_guest_charge,
      cleaning_fee: allocation.cleaning_fee,
      extra_charges: allocation.extra_charges,
      upsells: allocation.upsells,
      booking_taxes: allocation.booking_taxes,
      channel_commission: commission,
      total_management_fee: allocation.total_management_fee,
      payment_processing_fee: allocation.payment_processing_fee,
      total_payout: allocation.total_payout,
      is_prorated: allocation.isProrated && !allocation.isFullPayment,
      nights_in_period: allocation.nights,
      total_stay_nights: allocation.totalNights,
      is_manual_override: allocation.isManualOverride,
      is_full_payment: allocation.isFullPayment,
      manual_note: allocation.manualNote,
    }
  }

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
  midStayCleanFee?: number
  bookings: StatementBookingInput[]
  manualExpenses?: StatementExpenseItem[]
  existingStatementId?: string | null
  existingStatementStatus?: "DRAFT" | "FINAL" | null
  hasPdf?: boolean
  isVirtualClient?: boolean
  bookingOverrides?: StatementBookingOverrideRow[]
  scheduleCleaningExpenses?: StatementExpenseItem[]
}): PropertyStatement {
  const eligible = filterBookingsForStatementMonth(input.bookings, input.year, input.month, {
    includeAlreadyOnStatement: true,
  })
  const allocations = allocationsForStatementMonth(
    eligible,
    input.year,
    input.month,
    input.bookingOverrides ?? []
  )
  const feeType = input.managementFeeType ?? "percentage"
  const rate = input.commissionPercentProperty ?? 0
  const welcomePackUnit = round2(input.welcomePackFeePerBooking ?? 0)
  const bookingCount = allocations.length

  const cleaningExpenseLines = buildCleaningFeeExpenseLines(
    allocations.map((a) => ({
      id: a.booking.id,
      guestName: a.booking.guest_name,
      cleaningFee: a.cleaning_fee,
    }))
  )
  const welcomePackExpenseLines = buildWelcomePackExpenseLines(
    allocations.map((a) => ({ id: a.booking.id, guestName: a.booking.guest_name })),
    welcomePackUnit
  )
  const scheduleCleaningExpenseLines = input.scheduleCleaningExpenses ?? []
  const automaticExpenses = [
    ...cleaningExpenseLines,
    ...welcomePackExpenseLines,
    ...scheduleCleaningExpenseLines,
  ]
  const manualExpenses = input.manualExpenses ?? []
  const manualExpensesTotal = sumExpenseItems(manualExpenses)
  const totalWelcomePackFees = sumExpenseItems(welcomePackExpenseLines)
  const totalCleaningInExpenses = sumExpenseItems([
    ...cleaningExpenseLines,
    ...scheduleCleaningExpenseLines,
  ])
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

  const lines: StatementLine[] = allocations.map((a) => {
    const b = a.booking
    const row = bookingToSnapshotRow(b, a)
    const nights = a.nights
    totalNights += nights
    const gross = allocationGrossRevenue(a)
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
      isProrated: a.isProrated && !a.isManualOverride && !a.isFullPayment,
      nightsInMonth: a.nights,
      totalStayNights: a.totalNights,
      isManualOverride: a.isManualOverride,
      isFullPayment: a.isFullPayment,
      manualNote: a.manualNote,
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
    midStayCleanFee: round2(input.midStayCleanFee ?? 0),
    existingStatementId: input.existingStatementId ?? null,
    existingStatementStatus: input.existingStatementStatus ?? null,
    hasPdf: input.hasPdf ?? false,
    existingStatementFileUrl: null,
    existingStatementFileName: null,
    isVirtualClient: input.isVirtualClient ?? false,
    bookingOverrides: input.bookingOverrides ?? [],
  }
}

/**
 * Bookings that may be selected on a statement for this period: active status,
 * nights in the statement month, and not on a different statement.
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
    if (!bookingHasNightsInCalendarMonth(b.check_in, b.check_out, year, month)) return false
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

/** Bookings eligible for auto-generate (unpaid only, active, nights in period). */
export function selectBookingIdsForAutoGenerate(
  bookings: StatementBookingInput[],
  year: number,
  month: number
): string[] {
  return filterBookingsForStatementMonth(bookings, year, month).map((b) => b.id)
}

/** Pro-ration display metadata for a booking row in a given statement month. */
export function prorationMetaForBookingInMonth(
  booking: Pick<StatementBookingInput, "check_in" | "check_out" | "is_manual_override">,
  year: number,
  month: number
): {
  isProrated: boolean
  nights: number
  totalNights: number
  ratio: number
} | null {
  const allocations = prorateBookingByMonth(booking as StatementBookingInput)
  const match = allocations.find((a) => a.year === year && a.month === month)
  if (!match) return null
  return {
    isProrated: match.isProrated,
    nights: match.nights,
    totalNights: match.totalNights,
    ratio: match.ratio,
  }
}
