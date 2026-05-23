import {
  bookingGrossFromSnapshot,
  bookingManagementFeeAmount,
} from "@/lib/clients/statement-financials"
import type {
  OwnerStatementExpenseComputed,
  OwnerStatementManualLineV1,
  OwnerStatementReceiptLineV1,
  OwnerStatementSnapshotBookingV1,
  OwnerStatementSnapshotV1,
  OwnerStatementTotalsV1,
} from "./types"

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function lineCharge(amount: number, addTenPercent: boolean): number {
  const base = roundMoney(amount)
  return addTenPercent ? roundMoney(base * 1.1) : base
}

type ManualLineSnapshotInput = Partial<OwnerStatementManualLineV1> & {
  id: string
  /** Legacy snapshots / payloads used a single amount (implicit qty 1). */
  amount?: number
}

/**
 * Normalise a manual line from the client or an older persisted snapshot
 * (`amount` only) into quantity × unit price.
 */
export function coerceOwnerStatementManualLine(raw: ManualLineSnapshotInput): OwnerStatementManualLineV1 {
  const description = typeof raw.description === "string" ? raw.description : ""
  const addTenPercent = Boolean(raw.addTenPercent)
  const q = raw.quantity
  const u = raw.unitPrice
  if (typeof q === "number" && Number.isFinite(q) && typeof u === "number" && Number.isFinite(u)) {
    return { id: raw.id, description, quantity: q, unitPrice: u, addTenPercent }
  }
  const legacy = typeof raw.amount === "number" && Number.isFinite(raw.amount) ? raw.amount : 0
  return { id: raw.id, description, quantity: 1, unitPrice: legacy, addTenPercent }
}

export function computeExpenses(
  manual: ManualLineSnapshotInput[],
  receipts: OwnerStatementReceiptLineV1[]
): { lines: OwnerStatementExpenseComputed[]; otherExpenses: number } {
  const lines: OwnerStatementExpenseComputed[] = []

  for (const raw of manual) {
    const m = coerceOwnerStatementManualLine(raw)
    const base = roundMoney(m.quantity * m.unitPrice)
    const charged = lineCharge(base, m.addTenPercent)
    lines.push({
      key: `m:${m.id}`,
      label: m.description.trim() || "Expense",
      baseAmount: base,
      addTenPercent: m.addTenPercent,
      chargedAmount: charged,
      quantity: m.quantity,
      unitPrice: m.unitPrice,
    })
  }

  for (const r of receipts) {
    const charged = lineCharge(r.amount, r.addTenPercent)
    lines.push({
      key: `r:${r.receiptId}`,
      label: r.supplier.trim() || "Receipt",
      baseAmount: roundMoney(r.amount),
      addTenPercent: r.addTenPercent,
      chargedAmount: charged,
      quantity: null,
      unitPrice: null,
    })
  }

  const otherExpenses = roundMoney(lines.reduce((s, l) => s + l.chargedAmount, 0))
  return { lines, otherExpenses }
}

export function effectiveCommissionPercent(
  propertyPercent: number | null | undefined,
  overridePercent: number | null | undefined
): number {
  if (overridePercent != null && Number.isFinite(overridePercent)) {
    return Math.min(100, Math.max(0, overridePercent))
  }
  if (propertyPercent != null && Number.isFinite(Number(propertyPercent))) {
    return Math.min(100, Math.max(0, Number(propertyPercent)))
  }
  return 0
}

function bookingFees(b: OwnerStatementSnapshotBookingV1): number {
  return roundMoney(b.channel_commission + b.payment_processing_fee)
}

export function buildTotals(
  bookings: OwnerStatementSnapshotBookingV1[],
  commissionPercent: number,
  manual: OwnerStatementManualLineV1[],
  receipts: OwnerStatementReceiptLineV1[]
): OwnerStatementTotalsV1 {
  const totalGross = roundMoney(bookings.reduce((s, b) => s + bookingGrossFromSnapshot(b), 0))
  const totalDiscount = roundMoney(
    bookings.reduce((s, b) => s + (Number.isFinite(b.discount) ? b.discount : 0), 0)
  )
  const totalBookingFees = roundMoney(bookings.reduce((s, b) => s + bookingFees(b), 0))
  const totalPayout = roundMoney(
    bookings.reduce((s, b) => s + (Number.isFinite(b.total_payout) ? b.total_payout : 0), 0)
  )
  const totalCleaning = roundMoney(
    bookings.reduce((s, b) => s + (Number.isFinite(b.cleaning_fee) ? b.cleaning_fee : 0), 0)
  )
  const totalManagementFees = roundMoney(
    bookings.reduce((s, b) => {
      const revenue = bookingGrossFromSnapshot(b)
      const fees = bookingFees(b)
      return (
        s +
        bookingManagementFeeAmount({
          revenue,
          bookingFees: fees,
          csvManagementFee: Number.isFinite(b.total_management_fee)
            ? b.total_management_fee
            : 0,
          feeType: "percentage",
          rate: commissionPercent,
          bookingCount: bookings.length,
        })
      )
    }, 0)
  )
  const rsaCommission = totalManagementFees
  const { lines: expenseLines, otherExpenses } = computeExpenses(manual, receipts)
  const totalWelcomePack = roundMoney(
    expenseLines
      .filter((l) => l.key.startsWith("m:welcome-pack:"))
      .reduce((s, l) => s + l.chargedAmount, 0)
  )
  const totalCleaningExpenses = roundMoney(
    expenseLines
      .filter((l) => l.key.startsWith("m:cleaning:"))
      .reduce((s, l) => s + l.chargedAmount, 0)
  )
  const manualExpenses = roundMoney(otherExpenses - totalWelcomePack - totalCleaningExpenses)
  const netToOwner =
    totalGross > 0
      ? roundMoney(totalGross - totalBookingFees - totalManagementFees - otherExpenses)
      : totalPayout > 0
        ? roundMoney(totalPayout - totalManagementFees - otherExpenses)
        : 0

  return {
    totalGross,
    totalDiscount,
    totalBookingFees,
    totalPayout,
    rsaCommission,
    totalCleaning,
    totalManagementFees,
    totalWelcomePack,
    manualExpenses,
    otherExpenses,
    netToOwner,
  }
}

export function buildSnapshotV1(input: {
  month: number
  year: number
  commissionPercentProperty: number | null
  commissionPercentOverride: number | null
  bookings: OwnerStatementSnapshotBookingV1[]
  manualLines: OwnerStatementManualLineV1[]
  receiptLines: OwnerStatementReceiptLineV1[]
}): OwnerStatementSnapshotV1 {
  const commissionPercentEffective = effectiveCommissionPercent(
    input.commissionPercentProperty,
    input.commissionPercentOverride
  )
  const totals = buildTotals(
    input.bookings,
    commissionPercentEffective,
    input.manualLines,
    input.receiptLines
  )

  return {
    version: 1,
    formula: "revenue_minus_fees_minus_management_minus_expenses",
    month: input.month,
    year: input.year,
    commissionPercentEffective,
    commissionPercentProperty: input.commissionPercentProperty,
    commissionPercentOverride: input.commissionPercentOverride,
    bookingIds: input.bookings.map((b) => b.id),
    bookings: input.bookings,
    manualLines: input.manualLines.map(coerceOwnerStatementManualLine),
    receiptLines: input.receiptLines,
    totals,
  }
}
