import type { StatementBookingInput } from "@/lib/statement-calculator"
import { prorationMetaForBookingInMonth } from "@/lib/statement-calculator"
import { isStatementActiveBookingStatus } from "@/lib/booking-status"
import type { ClientStatementBookingRow } from "@/types/statement"
import type { BookingStatus } from "@prisma/client"

export type PayoutFilter = "all" | "unpaid" | "paid"

export type StatementBookingTableRow = Pick<
  ClientStatementBookingRow,
  | "id"
  | "guest_name"
  | "check_in"
  | "check_out"
  | "channel_name"
  | "source"
  | "total_payout"
  | "cleaning_fee"
  | "csv_imported_at"
  | "uplisting_id"
  | "owner_statement_id"
>

export function isBookingOnOtherStatement(
  ownerStatementId: string | null | undefined,
  currentStatementId: string | null | undefined
): boolean {
  if (!ownerStatementId) return false
  if (!currentStatementId) return true
  return ownerStatementId !== currentStatementId
}

/** Whether the Include checkbox may be toggled for this statement period. */
export function canIncludeBookingOnStatement(
  ownerStatementId: string | null | undefined,
  currentStatementId: string | null | undefined,
  includeMode: "statement-eligible" | "next-month"
): boolean {
  if (includeMode === "next-month") return false
  return !isBookingOnOtherStatement(ownerStatementId, currentStatementId)
}

export function applyPayoutFilter<T extends { owner_statement_id: string | null }>(
  rows: T[],
  filter: PayoutFilter,
  currentStatementId?: string | null
): T[] {
  if (filter === "unpaid") {
    return rows.filter((b) => !isBookingOnOtherStatement(b.owner_statement_id, currentStatementId))
  }
  if (filter === "paid") {
    return rows.filter((b) => isBookingOnOtherStatement(b.owner_statement_id, currentStatementId))
  }
  return rows
}

export function formatStatementMonthYear(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}

function decimalLike(value: string | null): { toString: () => string } | null {
  if (value == null) return null
  return { toString: () => value }
}

export function clientBookingRowToInput(b: ClientStatementBookingRow): StatementBookingInput {
  return {
    id: b.id,
    guest_name: b.guest_name,
    check_in: new Date(b.check_in),
    check_out: new Date(b.check_out),
    channel_name: b.channel_name,
    source: b.source,
    status: b.status,
    owner_statement_id: b.owner_statement_id,
    accommodation_total: decimalLike(b.accommodation_total),
    discount: decimalLike(b.discount),
    extra_guest_charge: decimalLike(b.extra_guest_charge),
    cleaning_fee: decimalLike(b.cleaning_fee),
    extra_charges: decimalLike(b.extra_charges),
    upsells: decimalLike(b.upsells),
    booking_taxes: decimalLike(b.booking_taxes),
    commission: decimalLike(b.commission),
    commission_tax: decimalLike(b.commission_tax),
    total_management_fee: decimalLike(b.total_management_fee),
    payment_processing_fee: decimalLike(b.payment_processing_fee),
    total_payout: decimalLike(b.total_payout),
    gross_revenue: decimalLike(b.gross_revenue),
    is_manual_override: b.is_manual_override,
    manual_monthly_note: b.manual_monthly_note ?? null,
  }
}

export function serializeStatementBookingRow(
  b: StatementBookingInput & { csv_imported_at?: Date | null; uplisting_id?: string | null }
): ClientStatementBookingRow {
  const str = (v: { toString: () => string } | null | undefined) =>
    v != null ? v.toString() : null
  return {
    id: b.id,
    guest_name: b.guest_name,
    check_in: b.check_in.toISOString(),
    check_out: b.check_out.toISOString(),
    source: b.source,
    status: b.status,
    channel_name: b.channel_name,
    csv_imported_at: b.csv_imported_at?.toISOString() ?? null,
    uplisting_id: b.uplisting_id ?? null,
    owner_statement_id: b.owner_statement_id,
    accommodation_total: str(b.accommodation_total),
    discount: str(b.discount),
    extra_guest_charge: str(b.extra_guest_charge),
    cleaning_fee: str(b.cleaning_fee),
    extra_charges: str(b.extra_charges),
    upsells: str(b.upsells),
    booking_taxes: str(b.booking_taxes),
    commission: str(b.commission),
    commission_tax: str(b.commission_tax),
    total_management_fee: str(b.total_management_fee),
    payment_processing_fee: str(b.payment_processing_fee),
    total_payout: str(b.total_payout),
    gross_revenue: str(b.gross_revenue),
    is_manual_override: b.is_manual_override,
    manual_monthly_note: b.manual_monthly_note ?? null,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Pro-rated financial display for a booking in a statement month. */
export function proratedAmountForMonth(
  value: string | null,
  booking: ClientStatementBookingRow,
  year: number,
  month: number
): string | null {
  if (value == null || value === "") return value
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  const meta = prorationMetaForBookingInMonth(clientBookingRowToInput(booking), year, month)
  if (!meta?.isProrated) return value
  return String(round2(n * meta.ratio))
}

export function isStatementActiveBooking(status: BookingStatus): boolean {
  return isStatementActiveBookingStatus(status)
}
