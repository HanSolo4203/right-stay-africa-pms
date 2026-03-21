"use client"

import { useEffect, useState, useTransition } from "react"
import { updateBookingManualFields } from "@/app/(dashboard)/dashboard/properties/booking-actions"
import type { BookingListRow } from "@/components/bookings/booking-list"
import { formatChannelLabel } from "@/components/bookings/booking-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function formatMoney(amount: string | null | undefined) {
  if (amount == null || amount === "") return "—"
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) return String(amount)
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(numeric)
}

const csvImportTooltip = "Imported from CSV. Re-import to update."

type BookingFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  booking: BookingListRow | null
  canEdit: boolean
}

export function BookingFormModal({
  open,
  onOpenChange,
  propertyId,
  booking,
  canEdit,
}: BookingFormModalProps) {
  const [nightlyRate, setNightlyRate] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!booking || !open) return
    setNightlyRate(booking.nightly_rate)
    setNotes(booking.notes ?? "")
    setError(null)
  }, [booking, open])

  if (!booking) return null

  const isCsv = Boolean(booking.csv_imported_at)
  const channel = formatChannelLabel(booking.channel_name, booking.source)

  const onSave = () => {
    if (!canEdit) return
    setError(null)
    startTransition(async () => {
      try {
        await updateBookingManualFields(propertyId, booking.id, {
          nightly_rate: nightlyRate,
          notes: notes.trim() ? notes.trim() : null,
        })
        onOpenChange(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{booking.guest_name}</DialogTitle>
          <DialogDescription>
            {channel} · {booking.status.replace(/_/g, " ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isCsv ? (
            <div
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              title={csvImportTooltip}
            >
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">From CSV import</p>
              <dl className="grid gap-2 text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt>Last imported</dt>
                  <dd className="text-right text-slate-800">
                    {booking.csv_imported_at
                      ? new Date(booking.csv_imported_at).toLocaleString("en-ZA")
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Confirmation code</dt>
                  <dd className="font-mono text-right text-slate-800">
                    {booking.confirmation_code ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Gross revenue</dt>
                  <dd className="text-right text-slate-800">{formatMoney(booking.gross_revenue)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Net revenue</dt>
                  <dd className="text-right text-slate-800">{formatMoney(booking.net_revenue)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Commission</dt>
                  <dd className="text-right text-slate-800">{formatMoney(booking.commission)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Cleaning fee</dt>
                  <dd className="text-right text-slate-800">{formatMoney(booking.cleaning_fee)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Management fee</dt>
                  <dd className="text-right text-slate-800">{formatMoney(booking.total_management_fee)}</dd>
                </div>
              </dl>
              <p className="text-[11px] text-slate-500">{csvImportTooltip}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="booking-nightly-rate">Nightly rate (editable)</Label>
            <Input
              id="booking-nightly-rate"
              type="text"
              inputMode="decimal"
              value={nightlyRate}
              onChange={(e) => setNightlyRate(e.target.value)}
              disabled={!canEdit || isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-notes">Notes (editable)</Label>
            <Textarea
              id="booking-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit || isPending}
              placeholder="Internal notes…"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canEdit ? (
            <Button
              type="button"
              className="bg-green-700 text-white hover:bg-green-800"
              disabled={isPending}
              onClick={() => onSave()}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
