/** Client statements hub — aligned with owner-statement snapshot booking fields. */

import type { BookingSource, BookingStatus } from "@prisma/client"
import type { OwnerStatementSnapshotV1 } from "@/lib/owner-statement/types"
import type { StatementBookingInput } from "@/lib/statement-calculator"
import type { ScheduleCleaningTaskForStatement } from "@/lib/cleaning/statement-expenses"
import type { StatementExpenseCategoryValue } from "@/lib/validations/statement-expense"

/** Pro-rated share of a booking for one calendar month (Johannesburg). */
export type MonthlyAllocation = {
  year: number
  month: number
  nights: number
  totalNights: number
  ratio: number
  isProrated: boolean
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
  booking: StatementBookingInput
  /** Set when a StatementBookingOverride exists for this month. */
  isManualOverride?: boolean
  /** Full CSV payment attributed to this month (not pro-rated by nights). */
  isFullPayment?: boolean
  manualNote?: string
  overrideId?: string
}

/** Active booking row for client statement UI (matches financials CSV table). */
export type ClientStatementBookingRow = {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  source: BookingSource
  status: BookingStatus
  channel_name: string | null
  csv_imported_at: string | null
  uplisting_id: string | null
  owner_statement_id: string | null
  accommodation_total: string | null
  discount: string | null
  extra_guest_charge: string | null
  cleaning_fee: string | null
  extra_charges: string | null
  upsells: string | null
  booking_taxes: string | null
  commission: string | null
  commission_tax: string | null
  total_management_fee: string | null
  payment_processing_fee: string | null
  total_payout: string | null
  gross_revenue: string | null
  is_manual_override?: boolean
  manual_monthly_note?: string | null
}

export type StatementLine = {
  bookingId: string
  guestName: string
  checkIn: string
  checkOut: string
  nights: number
  platform: string
  grossRevenue: number
  discount: number
  bookingFees: number
  bookingPayout: number
  platformFee: number
  paymentProcessingFee: number
  cleaningFee: number
  welcomePackFee: number
  managementFeePercent: number | null
  managementFeeAmount: number
  netToOwner: number
  /** True when the stay spans more than one calendar month. */
  isProrated?: boolean
  /** Nights occupied in the statement month (may be less than full stay). */
  nightsInMonth?: number
  /** Total nights for the full booking stay. */
  totalStayNights?: number
  /** Custom amounts for this month (StatementBookingOverride). */
  isManualOverride?: boolean
  /** Full CSV payment for this period (not pro-rated by nights). */
  isFullPayment?: boolean
  manualNote?: string
}

export type PropertyStatementTotals = {
  grossRevenue: number
  totalDiscount: number
  totalBookingFees: number
  totalPlatformFees: number
  totalPaymentProcessingFees: number
  totalCleaningFees: number
  totalWelcomePackFees: number
  totalManagementFees: number
  totalBookingsPayout: number
  manualExpensesTotal: number
  additionalExpensesTotal: number
  netToOwner: number
  occupancyRate: number
  totalNights: number
  bookingCount: number
}

export type StatementExpenseItem = {
  id: string
  description: string
  qty: number
  unitPrice: number
  total: number
  /** System-generated (e.g. welcome pack per booking) — not editable in UI. */
  isAutomatic?: boolean
  addTenPercent?: boolean
  expenseCategory?: StatementExpenseCategoryValue | null
}

export type PropertyStatement = {
  propertyId: string
  propertyName: string
  month: number
  year: number
  /** All active bookings on this property (for period grouping / include toggles). */
  bookings: ClientStatementBookingRow[]
  lines: StatementLine[]
  totals: PropertyStatementTotals
  manualExpenses: StatementExpenseItem[]
  automaticExpenses: StatementExpenseItem[]
  /** @deprecated Use manualExpenses + automaticExpenses */
  additionalExpenses: StatementExpenseItem[]
  managementFeePercent: number | null
  welcomePackFeePerBooking: number
  /** Default unit price for mid-stay and manual cleans from the cleaning schedule. */
  midStayCleanFee: number
  managementFeeType: "percentage" | "fixed_monthly" | "fixed_per_booking"
  existingStatementId: string | null
  existingStatementStatus: "DRAFT" | "FINAL" | null
  hasPdf: boolean
  /** Storage path for finalized PDF (view/download). */
  existingStatementFileUrl: string | null
  existingStatementFileName: string | null
  /** True when client is a virtual unassigned-property entry — expenses API disabled. */
  isVirtualClient: boolean
  /** Persisted snapshot when a generated statement exists for this period. */
  statementSnapshot?: OwnerStatementSnapshotV1 | null
  /** Monthly amount overrides for bookings on this property/period. */
  bookingOverrides?: StatementBookingOverrideRow[]
  /** Mid-stay and manual cleans scheduled this month (drives automatic expense lines). */
  scheduleCleaningTasks?: ScheduleCleaningTaskForStatement[]
}

export type StatementBookingAllocationMode = "FULL_PAYMENT" | "MANUAL"

export type StatementBookingOverrideRow = {
  id: string
  booking_id: string
  property_id: string
  month: number
  year: number
  allocation_mode: StatementBookingAllocationMode
  note: string
  accommodation_total: number | null
  discount: number | null
  extra_charges: number | null
  cleaning_fee: number | null
  upsells: number | null
  booking_taxes: number | null
  channel_commission: number | null
  total_management_fee: number | null
  payment_processing_fee: number | null
  total_payout: number | null
}

export type ClientStatementSummary = {
  clientId: string
  clientName: string
  clientEmail: string
  clientStatus: "ACTIVE" | "ARCHIVED"
  properties: PropertyStatement[]
}
