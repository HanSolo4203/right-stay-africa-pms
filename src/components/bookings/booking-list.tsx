"use client"

import { BookingSource, BookingStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type BookingListRow = {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  num_guests: number
  source: BookingSource
  status: BookingStatus
  total: string
  nightly_rate: string
  notes: string | null
  channel_name: string | null
  csv_imported_at: string | null
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
  net_revenue: string | null
  confirmation_code: string | null
  owner_statement_id: string | null
}

const sourceLabel: Record<BookingSource, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  DIRECT: "Direct",
  OTHER: "Other",
}

const statusLabel: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
}

const statusClass: Record<BookingStatus, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-rose-100 text-rose-700",
}

function formatMoney(amount: string | null | undefined) {
  if (amount == null || amount === "") return "—"
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return amount
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(numeric)
}

/** Prefer CSV `channel_name` slugs; fall back to enum-based label. */
export function formatChannelLabel(channelName: string | null | undefined, source: BookingSource): string {
  const raw = channelName?.trim()
  if (raw) {
    const key = raw.toLowerCase()
    if (key.includes("airbnb")) return "Airbnb"
    if (key.includes("booking")) return "Booking.com"
    if (key === "uplisting" || key === "direct" || key.includes("direct")) return "Direct"
    return raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return sourceLabel[source]
}

function cleaningFeeHint(fee: string | null | undefined): string | null {
  if (fee == null || fee === "") return null
  const n = Number(fee)
  if (!Number.isFinite(n) || n === 0) return null
  return `Cleaning fee: ${formatMoney(fee)}`
}

type BookingListProps = {
  bookings: BookingListRow[]
  onRowClick?: (booking: BookingListRow) => void
}

export function BookingList({ bookings, onRowClick }: BookingListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Total payout</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const channel = formatChannelLabel(booking.channel_name, booking.source)
            const payout = booking.total_payout != null && booking.total_payout !== "" ? booking.total_payout : booking.total
            const cleaningHint = cleaningFeeHint(booking.cleaning_fee)
            const clickable = Boolean(onRowClick)

            return (
              <TableRow
                key={booking.id}
                className={clickable ? "cursor-pointer hover:bg-slate-50" : undefined}
                onClick={clickable ? () => onRowClick?.(booking) : undefined}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{booking.guest_name}</span>
                    {booking.csv_imported_at ? (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-[10px] text-amber-900"
                        title="Imported from CSV"
                      >
                        CSV
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">
                  {new Date(booking.check_in).toLocaleDateString("en-ZA")}
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">
                  {new Date(booking.check_out).toLocaleDateString("en-ZA")}
                </TableCell>
                <TableCell className="text-slate-700">{channel}</TableCell>
                <TableCell>
                  <Badge className={statusClass[booking.status]}>{statusLabel[booking.status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-medium tabular-nums">{formatMoney(booking.total)}</span>
                    {cleaningHint ? (
                      <span className="max-w-[200px] text-[10px] leading-tight text-slate-500" title={cleaningHint}>
                        {cleaningHint}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-slate-900">
                  {formatMoney(payout)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
