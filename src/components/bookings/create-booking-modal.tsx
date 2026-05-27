"use client"

import { BookingSource, BookingStatus } from "@prisma/client"
import { useEffect, useState, useTransition } from "react"
import { createManualBooking } from "@/app/(dashboard)/dashboard/properties/booking-actions"
import { bookingSourceLabel, defaultChannelNameForSource } from "@/lib/booking-source-label"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { ClientStatementBookingRow } from "@/types/statement"

const SOURCE_OPTIONS: BookingSource[] = [
  BookingSource.AIRBNB,
  BookingSource.BOOKING_COM,
  BookingSource.DIRECT,
  BookingSource.OTHER,
]

const STATUS_OPTIONS: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
  BookingStatus.CANCELLED,
]

function parseAmount(s: string): number {
  const trimmed = s.trim()
  if (!trimmed) return 0
  const n = Number(trimmed.replace(/,/g, ""))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

type CreateBookingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  onCreated?: (result: {
    id: string
    check_in: string
    check_out: string
    booking: ClientStatementBookingRow
  }) => void | Promise<void>
}

export function CreateBookingModal({
  open,
  onOpenChange,
  propertyId,
  onCreated,
}: CreateBookingModalProps) {
  const [guestName, setGuestName] = useState("")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [numGuests, setNumGuests] = useState("1")
  const [source, setSource] = useState<BookingSource>(BookingSource.AIRBNB)
  const [channelName, setChannelName] = useState(defaultChannelNameForSource(BookingSource.AIRBNB))
  const [status, setStatus] = useState<BookingStatus>(BookingStatus.CONFIRMED)
  const [confirmationCode, setConfirmationCode] = useState("")
  const [notes, setNotes] = useState("")
  const [totalPayout, setTotalPayout] = useState("")
  const [grossRevenue, setGrossRevenue] = useState("")
  const [accommodationTotal, setAccommodationTotal] = useState("")
  const [cleaningFee, setCleaningFee] = useState("")
  const [commission, setCommission] = useState("")
  const [commissionTax, setCommissionTax] = useState("")
  const [paymentProcessingFee, setPaymentProcessingFee] = useState("")
  const [totalManagementFee, setTotalManagementFee] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setGuestName("")
    setCheckIn("")
    setCheckOut("")
    setNumGuests("1")
    setSource(BookingSource.AIRBNB)
    setChannelName(defaultChannelNameForSource(BookingSource.AIRBNB))
    setStatus(BookingStatus.CONFIRMED)
    setConfirmationCode("")
    setNotes("")
    setTotalPayout("")
    setGrossRevenue("")
    setAccommodationTotal("")
    setCleaningFee("")
    setCommission("")
    setCommissionTax("")
    setPaymentProcessingFee("")
    setTotalManagementFee("")
    setError(null)
  }, [open])

  const onSourceChange = (value: BookingSource) => {
    setSource(value)
    setChannelName(defaultChannelNameForSource(value))
  }

  const onSubmit = () => {
    setError(null)
    const guests = Number.parseInt(numGuests, 10)
    if (!Number.isFinite(guests) || guests < 1) {
      setError("Number of guests must be at least 1.")
      return
    }

    startTransition(async () => {
      try {
        const result = await createManualBooking(propertyId, {
          guest_name: guestName,
          check_in: checkIn,
          check_out: checkOut,
          num_guests: guests,
          source,
          channel_name: channelName.trim() || null,
          status,
          confirmation_code: confirmationCode.trim() || null,
          notes: notes.trim() || null,
          total_payout: parseAmount(totalPayout),
          gross_revenue: parseAmount(grossRevenue),
          accommodation_total: parseAmount(accommodationTotal),
          cleaning_fee: parseAmount(cleaningFee),
          commission: parseAmount(commission),
          commission_tax: parseAmount(commissionTax),
          payment_processing_fee: parseAmount(paymentProcessingFee),
          total_management_fee: parseAmount(totalManagementFee),
        })
        toast.success("Booking added.")
        onOpenChange(false)
        await onCreated?.(result)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not create booking."
        setError(msg)
        toast.error(msg)
      }
    })
  }

  const today = toDateInputValue(new Date())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add booking</DialogTitle>
          <DialogDescription>
            Record a stay that is missing from CSV import. It will appear on calendars and client
            statements. Use Custom amounts on a statement to adjust figures per month if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Stay</p>
            <div className="space-y-2">
              <Label htmlFor="manual-guest-name">Guest name</Label>
              <Input
                id="manual-guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={isPending}
                placeholder="Guest name"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-check-in">Check-in</Label>
                <Input
                  id="manual-check-in"
                  type="date"
                  value={checkIn}
                  max={checkOut || undefined}
                  onChange={(e) => setCheckIn(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-check-out">Check-out</Label>
                <Input
                  id="manual-check-out"
                  type="date"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => setCheckOut(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-guests">Guests</Label>
                <Input
                  id="manual-guests"
                  type="number"
                  min={1}
                  max={99}
                  value={numGuests}
                  onChange={(e) => setNumGuests(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as BookingStatus)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={source}
                  onValueChange={(v) => onSourceChange(v as BookingSource)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {bookingSourceLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-channel">Channel (optional)</Label>
                <Input
                  id="manual-channel"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  disabled={isPending}
                  placeholder="e.g. airbnb_official"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Amounts (ZAR)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-payout">Total payout</Label>
                <Input
                  id="manual-payout"
                  inputMode="decimal"
                  value={totalPayout}
                  onChange={(e) => setTotalPayout(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-gross">Gross revenue</Label>
                <Input
                  id="manual-gross"
                  inputMode="decimal"
                  value={grossRevenue}
                  onChange={(e) => setGrossRevenue(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-accommodation">Accommodation</Label>
                <Input
                  id="manual-accommodation"
                  inputMode="decimal"
                  value={accommodationTotal}
                  onChange={(e) => setAccommodationTotal(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-cleaning">Cleaning fee</Label>
                <Input
                  id="manual-cleaning"
                  inputMode="decimal"
                  value={cleaningFee}
                  onChange={(e) => setCleaningFee(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-commission">Commission</Label>
                <Input
                  id="manual-commission"
                  inputMode="decimal"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-commission-tax">Commission tax</Label>
                <Input
                  id="manual-commission-tax"
                  inputMode="decimal"
                  value={commissionTax}
                  onChange={(e) => setCommissionTax(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-processing">Payment processing</Label>
                <Input
                  id="manual-processing"
                  inputMode="decimal"
                  value={paymentProcessingFee}
                  onChange={(e) => setPaymentProcessingFee(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-mgmt-fee">Management fee</Label>
                <Input
                  id="manual-mgmt-fee"
                  inputMode="decimal"
                  value={totalManagementFee}
                  onChange={(e) => setTotalManagementFee(e.target.value)}
                  disabled={isPending}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Optional</p>
            <div className="space-y-2">
              <Label htmlFor="manual-confirmation">Confirmation code</Label>
              <Input
                id="manual-confirmation"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                disabled={isPending}
                placeholder="Matches future CSV import if available"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-notes">Notes</Label>
              <Textarea
                id="manual-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                placeholder="Internal notes…"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-green-700 text-white hover:bg-green-800"
            disabled={isPending || !guestName.trim() || !checkIn || !checkOut}
            onClick={() => onSubmit()}
          >
            {isPending ? "Saving…" : "Add booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
