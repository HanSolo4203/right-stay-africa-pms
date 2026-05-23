import "server-only"

import { bookingGrossFromSnapshot } from "@/lib/clients/statement-financials"
import type { OwnerStatementSnapshotBookingV1 } from "./types"

export type StatementChannelSlice = {
  name: string
  gross: number
}

export type StatementIncomeExpenseTotals = {
  /** Sum of revenue columns (accom, cleaning, taxes, etc.). */
  income: number
  /** OTA deductions: discount, channel commission, processing. */
  expenses: number
  /** Management fees from bookings. */
  managementFees: number
  /** Additional expenses from the statement (manual + receipts). */
  additionalExpenses: number
  /** Management fees + additional expenses combined. */
  propertyDeductions: number
  /** Final owner payout from statement totals. */
  ownerPayout: number
  /** Owner payout as % of gross booking income. */
  ownerPayoutPctOfIncome: number
  /** OTA expenses as % of gross booking income. */
  expensesPctOfIncome: number
  /** Management fees as % of gross booking income. */
  managementFeesPctOfIncome: number
}

export type StatementAnalyticsSummary = {
  bookingCount: number
  bookedNights: number
  daysInMonth: number
  occupancyRate: number
  grossRevenue: number
  avgGrossPerNight: number
  avgLengthOfStay: number
}

/** Owner-readable description of per-booking gross (matches bookings table). */
export const BOOKING_GROSS_FORMULA_LABEL =
  "accommodation + cleaning + taxes + extras + upsells (or CSV gross revenue when imported)"

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function buildStatementChannelSlices(
  rows: OwnerStatementSnapshotBookingV1[]
): StatementChannelSlice[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const label = row.channel_label?.trim() || "Unknown"
    const gross = bookingGrossFromSnapshot(row)
    map.set(label, (map.get(label) ?? 0) + gross)
  }
  return [...map.entries()]
    .map(([name, gross]) => ({ name, gross: round2(gross) }))
    .filter((x) => x.gross > 0)
    .sort((a, b) => b.gross - a.gross)
}

export function computeStatementIncomeExpense(
  rows: OwnerStatementSnapshotBookingV1[],
  ownerPayout: number,
  additionalExpenses = 0
): StatementIncomeExpenseTotals {
  let income = 0
  let expenses = 0
  let managementFees = 0

  for (const r of rows) {
    income += bookingGrossFromSnapshot(r)
    expenses += r.discount + r.channel_commission + r.payment_processing_fee
    managementFees += r.total_management_fee
  }

  income = round2(income)
  expenses = round2(expenses)
  managementFees = round2(managementFees)
  additionalExpenses = round2(additionalExpenses)
  const owner = round2(ownerPayout)

  const ownerPayoutPctOfIncome = income > 0 ? round2((owner / income) * 100) : 0
  const expensesPctOfIncome = income > 0 ? round2((expenses / income) * 100) : 0
  const managementFeesPctOfIncome = income > 0 ? round2((managementFees / income) * 100) : 0

  return {
    income,
    expenses,
    managementFees,
    additionalExpenses,
    propertyDeductions: round2(managementFees + additionalExpenses),
    ownerPayout: owner,
    ownerPayoutPctOfIncome,
    expensesPctOfIncome,
    managementFeesPctOfIncome,
  }
}

export function computeStatementAnalyticsSummary(input: {
  bookingCount: number
  bookedNights: number
  daysInMonth: number
  occupancyRate: number
  grossRevenue: number
}): StatementAnalyticsSummary {
  const { bookingCount, bookedNights, daysInMonth, occupancyRate, grossRevenue } = input
  const avgGrossPerNight = bookedNights > 0 ? round2(grossRevenue / bookedNights) : 0
  const avgLengthOfStay = bookingCount > 0 ? round2(bookedNights / bookingCount) : 0

  return {
    bookingCount,
    bookedNights,
    daysInMonth,
    occupancyRate: round2(occupancyRate),
    grossRevenue: round2(grossRevenue),
    avgGrossPerNight,
    avgLengthOfStay,
  }
}

export function channelSharePercent(channelGross: number, totalGross: number): number {
  if (totalGross <= 0) return 0
  return round2((channelGross / totalGross) * 100)
}

export function channelDonutColor(label: string, index: number): string {
  const n = label.toLowerCase()
  if (n.includes("airbnb")) return "#FF5A5F"
  if (n.includes("booking")) return "#003580"
  if (n.includes("uplisting") || n.includes("direct")) return "#166534"
  if (n.includes("vrbo") || n.includes("homeaway")) return "#2B6CB0"
  if (n.includes("expedia")) return "#FFC72C"
  const FALLBACK = ["#0d9488", "#7c3aed", "#c2410c", "#64748b", "#78716c"]
  return FALLBACK[index % FALLBACK.length]
}
