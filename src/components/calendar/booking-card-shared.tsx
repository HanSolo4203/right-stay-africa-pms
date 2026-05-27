"use client"

import type { ReactNode } from "react"
import { BookingStatus } from "@prisma/client"
import { differenceInCalendarDays, format } from "date-fns"
import { Building2, CalendarRange, Hash, Moon, Wallet } from "lucide-react"
import { getPlatformColor } from "@/lib/calendar-utils"
import type { CalendarBooking } from "@/lib/calendar/types"
import { cn } from "@/lib/utils"

export const statusLabel: Record<string, string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
}

export function statusBadgeClass(status: string) {
  if (status === BookingStatus.CANCELLED) return "bg-rose-100 text-rose-700 ring-rose-200/60"
  if (status === "PENDING") return "bg-amber-100 text-amber-800 ring-amber-200/60"
  return "bg-emerald-50 text-emerald-800 ring-emerald-200/60"
}

export function guestInitials(name: string | null | undefined) {
  const parts = (name ?? "G").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "G"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function bookingNights(booking: CalendarBooking) {
  return (
    booking.nights ??
    differenceInCalendarDays(new Date(booking.checkOut), new Date(booking.checkIn))
  )
}

export function formatPayout(payout: string | null | undefined) {
  if (!payout) return null
  return `R ${Number(payout).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
}

type BookingCardShellProps = {
  booking: CalendarBooking
  propertyName?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function BookingCardShell({
  booking,
  propertyName,
  children,
  footer,
  className,
}: BookingCardShellProps) {
  const color = getPlatformColor(booking.platform)
  const isCancelled = booking.status === BookingStatus.CANCELLED

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80",
        isCancelled && "opacity-95",
        className
      )}
    >
      <header
        className="relative px-4 py-3"
        style={{ backgroundColor: color.light }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: isCancelled ? "#F87171" : color.border }}
        />
        <div className="flex items-center justify-between gap-2 pl-2">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase"
            style={{
              backgroundColor: isCancelled ? "#FEE2E2" : color.bg,
              color: isCancelled ? "#991B1B" : color.text,
            }}
          >
            {booking.platform ?? "Unknown"}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
              statusBadgeClass(booking.status)
            )}
          >
            {statusLabel[booking.status] ?? booking.status}
          </span>
        </div>
      </header>

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ring-2 ring-white"
            style={{
              backgroundColor: isCancelled ? "#FEE2E2" : color.bg,
              color: isCancelled ? "#991B1B" : color.text,
            }}
          >
            {guestInitials(booking.guestName)}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate text-base font-semibold text-slate-900",
                isCancelled && "line-through decoration-slate-400"
              )}
            >
              {booking.guestName ?? "Guest"}
            </h3>
            {propertyName ? (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <Building2 className="size-3 shrink-0" aria-hidden />
                {propertyName}
              </p>
            ) : null}
            {booking.confirmationCode ? (
              <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[11px] text-slate-400">
                <Hash className="size-3 shrink-0" aria-hidden />
                {booking.confirmationCode}
              </p>
            ) : null}
          </div>
        </div>

        {children}
      </div>

      {footer ? (
        <footer className="border-t border-slate-100 bg-slate-50/80 px-4 py-2">{footer}</footer>
      ) : null}
    </article>
  )
}

export function BookingDateRange({ booking }: { booking: CalendarBooking }) {
  const nights = bookingNights(booking)
  const checkIn = new Date(booking.checkIn)
  const checkOut = new Date(booking.checkOut)

  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Check-in</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{format(checkIn, "d MMM")}</p>
          <p className="mt-0.5 text-sm text-slate-500">{format(checkIn, "EEE yyyy")}</p>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 px-1">
          <div className="h-px w-10 bg-slate-300" />
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Moon className="size-4 text-slate-500" aria-hidden />
            {nights}
            <span className="sr-only">nights</span>
          </span>
          <div className="h-px w-10 bg-slate-300" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Check-out</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{format(checkOut, "d MMM")}</p>
          <p className="mt-0.5 text-sm text-slate-500">{format(checkOut, "EEE yyyy")}</p>
        </div>
      </div>
    </div>
  )
}

type StatTileProps = {
  icon: ReactNode
  label: string
  value: string
  highlight?: boolean
}

function StatTile({ icon, label, value, highlight }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 ring-1",
        highlight
          ? "bg-emerald-50/80 ring-emerald-100"
          : "bg-white ring-slate-100"
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          highlight ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-slate-400">{label}</p>
        <p
          className={cn(
            "truncate text-sm font-semibold",
            highlight ? "text-emerald-800" : "text-slate-800"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export function BookingStatTiles({ booking }: { booking: CalendarBooking }) {
  const nights = bookingNights(booking)
  const payout = formatPayout(booking.payout)

  return (
    <div className={cn("grid gap-2", payout ? "grid-cols-2" : "grid-cols-1")}>
      <StatTile
        icon={<CalendarRange className="size-3.5" />}
        label="Stay"
        value={`${nights} night${nights === 1 ? "" : "s"}`}
      />
      {payout ? (
        <StatTile
          icon={<Wallet className="size-3.5" />}
          label="Payout"
          value={payout}
          highlight
        />
      ) : null}
    </div>
  )
}
