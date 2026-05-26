import {
  buildAutomaticExpenseManualLines,
  filterUserManualLines,
} from "@/lib/clients/automatic-statement-expenses"
import { statementExpenseItemsToManualLines } from "@/lib/clients/statement-expense-mappers"
import { buildSnapshotV1 } from "@/lib/owner-statement/compute"
import type {
  OwnerStatementReceiptLineV1,
  OwnerStatementSnapshotV1,
} from "@/lib/owner-statement/types"
import {
  allocationsForStatementMonth,
  bookingToSnapshotRow,
  type StatementBookingInput,
} from "@/lib/statement-calculator"
import type { PropertyStatement, PropertyStatementTotals, StatementExpenseItem } from "@/types/statement"

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** OTA channel commission + payment processing per booking row. */
export function totalBookingFeesFromSnapshotBookings(
  bookings: OwnerStatementSnapshotV1["bookings"]
): number {
  return round2(
    bookings.reduce((s, b) => s + b.channel_commission + b.payment_processing_fee, 0)
  )
}

/** Map persisted snapshot totals to client statement summary fields. */
export function totalsFromSnapshot(
  snap: OwnerStatementSnapshotV1,
  occupancy?: Pick<PropertyStatementTotals, "totalNights" | "bookingCount" | "occupancyRate">
): PropertyStatementTotals {
  const t = snap.totals
  let totalPlatformFees = 0
  let totalPaymentProcessingFees = 0
  let totalDiscount = 0
  let totalCleaningFees = 0
  for (const b of snap.bookings) {
    totalPlatformFees += b.channel_commission
    totalPaymentProcessingFees += b.payment_processing_fee
    totalDiscount += b.discount
    totalCleaningFees += b.cleaning_fee
  }
  const totalBookingFees = totalBookingFeesFromSnapshotBookings(snap.bookings)
  const netToOwner =
    t.totalGross > 0
      ? round2(t.totalGross - totalBookingFees - t.totalManagementFees - t.otherExpenses)
      : t.netToOwner

  return {
    grossRevenue: t.totalGross,
    totalDiscount: round2(t.totalDiscount ?? totalDiscount),
    totalBookingFees,
    totalPlatformFees: round2(totalPlatformFees),
    totalPaymentProcessingFees: round2(totalPaymentProcessingFees),
    totalCleaningFees: round2(t.totalCleaning ?? totalCleaningFees),
    totalWelcomePackFees: round2(t.totalWelcomePack ?? 0),
    totalManagementFees: t.totalManagementFees,
    totalBookingsPayout: t.totalPayout,
    manualExpensesTotal: round2(t.manualExpenses ?? 0),
    additionalExpensesTotal: t.otherExpenses,
    netToOwner,
    occupancyRate: occupancy?.occupancyRate ?? 0,
    totalNights: occupancy?.totalNights ?? 0,
    bookingCount: occupancy?.bookingCount ?? snap.bookings.length,
  }
}

/**
 * Same calculation path as PDF generation ({@link buildSnapshotForProperty}).
 */
export function buildOwnerStatementPreview(input: {
  month: number
  year: number
  commissionPercentProperty: number | null
  commissionPercentOverride?: number | null
  welcomePackFeePerBooking: number
  bookings: StatementBookingInput[]
  manualExpenses: StatementExpenseItem[]
  /** When set (including user edits), used instead of recomputing from CSV defaults. */
  automaticExpenses?: StatementExpenseItem[]
  receiptLines?: OwnerStatementReceiptLineV1[]
  bookingOverrides?: import("@/types/statement").StatementBookingOverrideRow[]
}): OwnerStatementSnapshotV1 {
  const allocations = allocationsForStatementMonth(
    input.bookings,
    input.year,
    input.month,
    input.bookingOverrides ?? []
  )
  const snapshotBookings = allocations.map((a) => bookingToSnapshotRow(a.booking, a))
  const userManual = statementExpenseItemsToManualLines(input.manualExpenses)
  const automatic =
    input.automaticExpenses != null
      ? statementExpenseItemsToManualLines(input.automaticExpenses)
      : buildAutomaticExpenseManualLines(
          allocations.map((a) => ({
            id: a.booking.id,
            guestName: a.booking.guest_name,
            cleaningFee: a.cleaning_fee,
          })),
          input.welcomePackFeePerBooking
        )
  const manualLines = [...automatic, ...filterUserManualLines(userManual)]

  return buildSnapshotV1({
    month: input.month,
    year: input.year,
    commissionPercentProperty: input.commissionPercentProperty,
    commissionPercentOverride: input.commissionPercentOverride ?? null,
    bookings: snapshotBookings,
    manualLines,
    receiptLines: input.receiptLines ?? [],
  })
}

/** Prefer persisted snapshot totals when a draft/final statement exists. */
export function hydrateStatementTotals(
  statement: PropertyStatement,
  snapshot: OwnerStatementSnapshotV1 | null | undefined
): PropertyStatement {
  if (snapshot == null) return statement
  return {
    ...statement,
    totals: totalsFromSnapshot(snapshot, {
      totalNights: statement.totals.totalNights,
      bookingCount: statement.totals.bookingCount,
      occupancyRate: statement.totals.occupancyRate,
    }),
  }
}

/** Merge live snapshot-engine totals into a {@link PropertyStatement} (keeps lines/expenses UI). */
export function applyPreviewTotalsToStatement(
  statement: PropertyStatement,
  preview: OwnerStatementSnapshotV1
): PropertyStatement {
  return {
    ...statement,
    totals: totalsFromSnapshot(preview, {
      totalNights: statement.totals.totalNights,
      bookingCount: statement.lines.length,
      occupancyRate: statement.totals.occupancyRate,
    }),
  }
}
