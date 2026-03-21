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

export function computeExpenses(
  manual: OwnerStatementManualLineV1[],
  receipts: OwnerStatementReceiptLineV1[]
): { lines: OwnerStatementExpenseComputed[]; otherExpenses: number } {
  const lines: OwnerStatementExpenseComputed[] = []

  for (const m of manual) {
    const charged = lineCharge(m.amount, m.addTenPercent)
    lines.push({
      key: `m:${m.id}`,
      label: m.description.trim() || "Expense",
      baseAmount: roundMoney(m.amount),
      addTenPercent: m.addTenPercent,
      chargedAmount: charged,
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

export function buildTotals(
  bookings: OwnerStatementSnapshotBookingV1[],
  commissionPercent: number,
  manual: OwnerStatementManualLineV1[],
  receipts: OwnerStatementReceiptLineV1[]
): OwnerStatementTotalsV1 {
  const totalPayout = roundMoney(
    bookings.reduce((s, b) => s + (Number.isFinite(b.total_payout) ? b.total_payout : 0), 0)
  )
  const totalCleaning = roundMoney(
    bookings.reduce((s, b) => s + (Number.isFinite(b.cleaning_fee) ? b.cleaning_fee : 0), 0)
  )
  const rsaCommission = roundMoney((totalPayout * commissionPercent) / 100)
  const { otherExpenses } = computeExpenses(manual, receipts)
  const netToOwner = roundMoney(totalPayout - rsaCommission - totalCleaning - otherExpenses)

  return {
    totalPayout,
    rsaCommission,
    totalCleaning,
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
    formula: "payout_minus_commission_minus_cleaning_minus_expenses",
    month: input.month,
    year: input.year,
    commissionPercentEffective,
    commissionPercentProperty: input.commissionPercentProperty,
    commissionPercentOverride: input.commissionPercentOverride,
    bookingIds: input.bookings.map((b) => b.id),
    bookings: input.bookings,
    manualLines: input.manualLines,
    receiptLines: input.receiptLines,
    totals,
  }
}
