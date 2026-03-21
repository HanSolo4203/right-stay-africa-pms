"use client"

import { BookingStatus } from "@prisma/client"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import type { ReactNode } from "react"
import type { BookingListRow } from "@/components/bookings/booking-list"
import { formatChannelLabel } from "@/components/bookings/booking-list"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

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

function cell(label: string, value: ReactNode) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 last:border-0 sm:grid sm:grid-cols-[minmax(0,140px)_1fr] sm:items-baseline sm:gap-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  )
}

function formatMoneyCell(s: string | null | undefined): string {
  if (s == null || s === "") return "—"
  const n = Number(s)
  if (!Number.isFinite(n)) return s
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(n)
}

type BookingDetailSheetProps = {
  booking: BookingListRow
  onClose: () => void
}

/**
 * Only mount when `booking` is non-null (parent guards). A closed Dialog/Sheet with no
 * Content still participates in Radix ref composition and can cause "Maximum update depth"
 * loops when `open={false}` is driven from null booking.
 */
export function BookingDetailSheet({ booking, onClose }: BookingDetailSheetProps) {
  const checkIn = parseISO(booking.check_in)
  const checkOut = parseISO(booking.check_out)
  const nights =
    Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())
      ? null
      : Math.max(0, differenceInCalendarDays(checkOut, checkIn))

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="pr-8">{booking.guest_name}</SheetTitle>
          <SheetDescription>
            {formatChannelLabel(booking.channel_name, booking.source)}
            {booking.confirmation_code ? ` · ${booking.confirmation_code}` : null}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <div className="mb-4">
            <Badge className={statusClass[booking.status]}>{statusLabel[booking.status]}</Badge>
            {booking.owner_statement_id ? (
              <Badge variant="outline" className="ml-2 font-normal">
                On a statement
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2 font-normal">
                Not on a statement
              </Badge>
            )}
          </div>
          <dl>
            {cell(
              "Stay",
              <>
                {Number.isNaN(checkIn.getTime()) ? "—" : format(checkIn, "d MMM yyyy")}
                {" → "}
                {Number.isNaN(checkOut.getTime()) ? "—" : format(checkOut, "d MMM yyyy")}
                {nights != null ? ` · ${nights} night${nights === 1 ? "" : "s"}` : null}
              </>
            )}
            {cell("Guests", String(booking.num_guests))}
            {cell("Total (booking)", formatMoneyCell(booking.total))}
            {cell("Accommodation total (CSV)", formatMoneyCell(booking.accommodation_total))}
            {cell("Discount (CSV)", formatMoneyCell(booking.discount))}
            {cell("Extra guest charge (CSV)", formatMoneyCell(booking.extra_guest_charge))}
            {cell("Cleaning fee (CSV)", formatMoneyCell(booking.cleaning_fee))}
            {cell("Extra charges (CSV)", formatMoneyCell(booking.extra_charges))}
            {cell("Upsells (CSV)", formatMoneyCell(booking.upsells))}
            {cell("Booking taxes (CSV)", formatMoneyCell(booking.booking_taxes))}
            {cell("Channel commission (CSV)", formatMoneyCell(booking.commission))}
            {cell("Commission tax (CSV)", formatMoneyCell(booking.commission_tax))}
            {cell("Management fee (CSV)", formatMoneyCell(booking.total_management_fee))}
            {cell("Payment processing fee (CSV)", formatMoneyCell(booking.payment_processing_fee))}
            {cell("Gross revenue (CSV)", formatMoneyCell(booking.gross_revenue))}
            {cell("Net revenue (CSV)", formatMoneyCell(booking.net_revenue))}
            {cell("Total payout (CSV)", formatMoneyCell(booking.total_payout))}
            {cell("Nightly rate", formatMoneyCell(booking.nightly_rate))}
            {cell(
              "CSV import",
              booking.csv_imported_at
                ? format(parseISO(booking.csv_imported_at), "d MMM yyyy HH:mm")
                : "—"
            )}
            {cell("Notes", booking.notes?.trim() ? booking.notes : "—")}
          </dl>
        </div>
      </SheetContent>
    </Sheet>
  )
}
