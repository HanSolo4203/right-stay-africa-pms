/** Persisted on Statement.snapshot for GENERATED rows (draft + final). */
export type OwnerStatementSnapshotV1 = {
  version: 1
  formula: "payout_minus_commission_minus_cleaning_minus_expenses"
  month: number
  year: number
  commissionPercentEffective: number
  commissionPercentProperty: number | null
  commissionPercentOverride: number | null
  bookingIds: string[]
  bookings: OwnerStatementSnapshotBookingV1[]
  manualLines: OwnerStatementManualLineV1[]
  receiptLines: OwnerStatementReceiptLineV1[]
  totals: OwnerStatementTotalsV1
}

export type OwnerStatementSnapshotBookingV1 = {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  num_nights: number
  channel_label: string
  accommodation_total: number
  discount: number
  extra_guest_charge: number
  cleaning_fee: number
  extra_charges: number
  upsells: number
  booking_taxes: number
  channel_commission: number // commission + commission_tax (inc. tax)
  total_management_fee: number
  payment_processing_fee: number
  total_payout: number
}

export type OwnerStatementManualLineV1 = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  addTenPercent: boolean
}

export type OwnerStatementReceiptLineV1 = {
  receiptId: string
  supplier: string
  amount: number
  addTenPercent: boolean
}

export type OwnerStatementTotalsV1 = {
  totalPayout: number
  rsaCommission: number
  totalCleaning: number
  otherExpenses: number
  netToOwner: number
}

export type OwnerStatementExpenseComputed = {
  key: string
  label: string
  baseAmount: number
  addTenPercent: boolean
  chargedAmount: number
  /** Manual lines only; receipts use null. */
  quantity: number | null
  unitPrice: number | null
}

export function isOwnerStatementSnapshotV1(value: unknown): value is OwnerStatementSnapshotV1 {
  if (value == null || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  return o.version === 1 && typeof o.month === "number" && typeof o.year === "number"
}
