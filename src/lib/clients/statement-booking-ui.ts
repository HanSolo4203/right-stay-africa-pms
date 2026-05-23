import type { StatementBookingInput } from "@/lib/statement-calculator"
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
  | "owner_statement_id"
>

export function applyPayoutFilter<T extends { owner_statement_id: string | null }>(
  rows: T[],
  filter: PayoutFilter
): T[] {
  if (filter === "unpaid") return rows.filter((b) => !b.owner_statement_id)
  if (filter === "paid") return rows.filter((b) => b.owner_statement_id)
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
  }
}

export function serializeStatementBookingRow(
  b: StatementBookingInput & { csv_imported_at?: Date | null }
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
  }
}

export function isStatementActiveBooking(status: BookingStatus): boolean {
  return isStatementActiveBookingStatus(status)
}
