/** Client statements hub — aligned with owner-statement snapshot booking fields. */

import type { BookingSource, BookingStatus } from "@prisma/client"

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
  managementFeeType: "percentage" | "fixed_monthly" | "fixed_per_booking"
  existingStatementId: string | null
  existingStatementStatus: "DRAFT" | "FINAL" | null
  hasPdf: boolean
  /** Storage path for finalized PDF (view/download). */
  existingStatementFileUrl: string | null
  existingStatementFileName: string | null
  /** True when client is a virtual unassigned-property entry — expenses API disabled. */
  isVirtualClient: boolean
}

export type ClientStatementSummary = {
  clientId: string
  clientName: string
  clientEmail: string
  clientStatus: "ACTIVE" | "ARCHIVED"
  properties: PropertyStatement[]
}
