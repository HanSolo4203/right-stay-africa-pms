import {
  bookingFeesFromRow,
  bookingManagementFeeAmount,
} from "@/lib/clients/statement-financials"
import {
  allocationGrossRevenue,
  allocationsForStatementMonth,
  bookingToSnapshotRow,
  filterBookingsForStatementMonth,
  type StatementBookingInput,
} from "@/lib/statement-calculator"

export type ManagementFeeType = "percentage" | "fixed_monthly" | "fixed_per_booking"

export function calculateManagementFeeEarned(input: {
  feeType: ManagementFeeType
  rate: number
  bookings: StatementBookingInput[]
  year: number
  month: number
}): { grossRevenue: number; feeEarned: number; bookingCount: number } {
  const eligible = filterBookingsForStatementMonth(input.bookings, input.year, input.month, {
    includeAlreadyOnStatement: true,
  })
  const allocations = allocationsForStatementMonth(eligible, input.year, input.month)
  const grossRevenue = allocations.reduce((s, a) => s + allocationGrossRevenue(a), 0)
  const bookingCount = allocations.length
  const rate = Math.max(0, input.rate)

  let feeEarned = 0
  switch (input.feeType) {
    case "fixed_monthly":
      feeEarned = rate
      break
    case "fixed_per_booking":
      feeEarned = rate * bookingCount
      break
    case "percentage":
    default:
      feeEarned = allocations.reduce((s, a) => {
        const row = bookingToSnapshotRow(a.booking, a)
        return (
          s +
          bookingManagementFeeAmount({
            revenue: allocationGrossRevenue(a),
            bookingFees: bookingFeesFromRow(row),
            csvManagementFee: row.total_management_fee,
            feeType: "percentage",
            rate,
            bookingCount,
          })
        )
      }, 0)
      break
  }

  return {
    grossRevenue: round2(grossRevenue),
    feeEarned: round2(feeEarned),
    bookingCount,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function parseManagementFeeType(value: string | null | undefined): ManagementFeeType {
  if (value === "fixed_monthly" || value === "fixed_per_booking") return value
  return "percentage"
}
