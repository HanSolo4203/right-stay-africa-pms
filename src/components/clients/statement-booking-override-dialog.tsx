"use client"

import { useEffect, useMemo, useState } from "react"
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
import { toast } from "@/components/ui/toast"
import { normalizeBookingOverrideAmounts } from "@/lib/clients/normalize-booking-override-amounts"
import type { ManagementFeeType } from "@/lib/clients/management-fee-calculator"
import { clientBookingRowToInput } from "@/lib/clients/statement-booking-ui"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import { bookingFinancialsFromInput, allocationsForStatementMonth } from "@/lib/statement-calculator"
import type {
  ClientStatementBookingRow,
  PropertyStatement,
  StatementBookingOverrideRow,
} from "@/types/statement"
import {
  bookingSpansMultipleMonths,
  overrideRowToUiMode,
  type StatementAllocationUiMode,
} from "@/lib/clients/statement-booking-allocation-ui"

type OverrideForm = {
  note: string
  accommodation_total: string
  total_payout: string
  channel_commission: string
  total_management_fee: string
  cleaning_fee: string
  payment_processing_fee: string
}

function emptyForm(): OverrideForm {
  return {
    note: "",
    accommodation_total: "",
    total_payout: "",
    channel_commission: "0",
    total_management_fee: "",
    cleaning_fee: "0",
    payment_processing_fee: "0",
  }
}

function allocationToForm(allocation: {
  accommodation_total: number
  channel_commission: number
  total_management_fee: number
  cleaning_fee: number
  payment_processing_fee: number
  total_payout: number
}): OverrideForm {
  return {
    note: "",
    accommodation_total: String(allocation.accommodation_total),
    total_payout: String(allocation.total_payout),
    channel_commission: String(allocation.channel_commission),
    total_management_fee: String(allocation.total_management_fee),
    cleaning_fee: String(allocation.cleaning_fee),
    payment_processing_fee: String(allocation.payment_processing_fee),
  }
}

function overrideToForm(override: StatementBookingOverrideRow): OverrideForm {
  return {
    note: override.note,
    accommodation_total:
      override.accommodation_total != null ? String(override.accommodation_total) : "",
    total_payout: override.total_payout != null ? String(override.total_payout) : "",
    channel_commission:
      override.channel_commission != null ? String(override.channel_commission) : "0",
    total_management_fee:
      override.total_management_fee != null ? String(override.total_management_fee) : "",
    cleaning_fee: override.cleaning_fee != null ? String(override.cleaning_fee) : "0",
    payment_processing_fee:
      override.payment_processing_fee != null ? String(override.payment_processing_fee) : "0",
  }
}

function parseAmount(s: string): number | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function StatementBookingOverrideDialog({
  open,
  onOpenChange,
  clientId,
  propertyId,
  month,
  year,
  booking,
  existingOverride,
  commissionPercent,
  managementFeeType,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  propertyId: string
  month: number
  year: number
  booking: ClientStatementBookingRow | null
  existingOverride: StatementBookingOverrideRow | null
  commissionPercent: number | null
  managementFeeType: ManagementFeeType
  onSaved: (statement?: PropertyStatement) => void
}) {
  const [allocationMode, setAllocationMode] = useState<StatementAllocationUiMode>("prorated")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [form, setForm] = useState<OverrideForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  const autoAllocation = useMemo(() => {
    if (!booking) return null
    const allocations = allocationsForStatementMonth(
      [clientBookingRowToInput(booking)],
      year,
      month
    )
    return allocations[0] ?? null
  }, [booking, month, year])

  const spansMonths = booking
    ? bookingSpansMultipleMonths(booking.check_in, booking.check_out)
    : false

  const fullPaymentPreview = useMemo(() => {
    if (!booking) return null
    return bookingFinancialsFromInput(clientBookingRowToInput(booking))
  }, [booking])

  useEffect(() => {
    if (!open || !booking) return
    if (existingOverride) {
      setAllocationMode(overrideRowToUiMode(existingOverride))
      setShowAdvanced(existingOverride.allocation_mode === "MANUAL")
      setForm(
        existingOverride.allocation_mode === "MANUAL"
          ? overrideToForm(existingOverride)
          : autoAllocation
            ? allocationToForm(autoAllocation)
            : emptyForm()
      )
    } else if (autoAllocation) {
      setAllocationMode("prorated")
      setShowAdvanced(false)
      setForm(allocationToForm(autoAllocation))
    } else {
      setAllocationMode("prorated")
      setShowAdvanced(false)
      setForm(emptyForm())
    }
  }, [open, booking, existingOverride, autoAllocation])

  const previewAmounts = useMemo(() => {
    if (allocationMode !== "manual" || !booking) return null
    try {
      return normalizeBookingOverrideAmounts({
        accommodation_total: parseAmount(form.accommodation_total),
        total_payout: parseAmount(form.total_payout),
        channel_commission: parseAmount(form.channel_commission),
        total_management_fee: parseAmount(form.total_management_fee),
        cleaning_fee: parseAmount(form.cleaning_fee),
        payment_processing_fee: parseAmount(form.payment_processing_fee),
        commissionPercent,
        managementFeeType,
      })
    } catch {
      return null
    }
  }, [allocationMode, booking, form, commissionPercent, managementFeeType])

  const setField = (key: keyof OverrideForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    if (!booking) return
    setSaving(true)
    try {
      const res = await fetch("/api/clients/statements/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          propertyId,
          bookingId: booking.id,
          month,
          year,
          allocationMode,
          note: allocationMode === "manual" ? form.note.trim() : undefined,
          accommodation_total:
            allocationMode === "manual" ? parseAmount(form.accommodation_total) : undefined,
          channel_commission:
            allocationMode === "manual" ? parseAmount(form.channel_commission) : undefined,
          total_management_fee:
            allocationMode === "manual" ? parseAmount(form.total_management_fee) : undefined,
          cleaning_fee: allocationMode === "manual" ? parseAmount(form.cleaning_fee) : undefined,
          payment_processing_fee:
            allocationMode === "manual" ? parseAmount(form.payment_processing_fee) : undefined,
          total_payout: allocationMode === "manual" ? parseAmount(form.total_payout) : undefined,
        }),
      })
      const payload = (await res.json()) as {
        error?: string
        statement?: PropertyStatement
      }
      if (!res.ok) throw new Error(payload.error ?? "Failed to save override.")
      toast.success(
        allocationMode === "prorated"
          ? "Using pro-rated amounts for this month."
          : allocationMode === "full_payment"
            ? "Using full CSV payment for this month."
            : "Statement amounts updated."
      )
      onOpenChange(false)
      onSaved(payload.statement)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save override.")
    } finally {
      setSaving(false)
    }
  }

  const removeOverride = async () => {
    if (!existingOverride) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/statements/overrides/${existingOverride.id}`, {
        method: "DELETE",
      })
      const payload = (await res.json()) as {
        error?: string
        statement?: PropertyStatement
      }
      if (!res.ok) throw new Error(payload.error ?? "Failed to remove override.")
      toast.success("Override removed.")
      onOpenChange(false)
      onSaved(payload.statement)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove override.")
    } finally {
      setSaving(false)
    }
  }

  const commissionLabel =
    managementFeeType === "percentage" && commissionPercent != null
      ? `${commissionPercent}%`
      : managementFeeType === "fixed_monthly"
        ? "fixed monthly"
        : "fixed per booking"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit booking amounts for this month</DialogTitle>
          <DialogDescription>
            Match the figures on your owner statement when CSV pro-ration differs — e.g. long stays
            paid as a lump sum, or a custom nightly payout.
          </DialogDescription>
        </DialogHeader>

        {booking ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-900">{booking.guest_name}</p>

            {autoAllocation ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                Automatic pro-ration: gross {formatMoneyZar(autoAllocation.accommodation_total)}, payout{" "}
                {formatMoneyZar(autoAllocation.total_payout)}
                {autoAllocation.isProrated
                  ? ` (${autoAllocation.nights} of ${autoAllocation.totalNights} nights this month)`
                  : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Amount source</Label>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="override-mode"
                    checked={allocationMode === "prorated"}
                    onChange={() => {
                      setAllocationMode("prorated")
                      if (autoAllocation) setForm(allocationToForm(autoAllocation))
                    }}
                  />
                  Pro-rated by nights in this month
                </label>
                {spansMonths ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="override-mode"
                      checked={allocationMode === "full_payment"}
                      onChange={() => setAllocationMode("full_payment")}
                    />
                    Full CSV payment this month
                    {fullPaymentPreview ? (
                      <span className="text-xs text-muted-foreground">
                        (payout {formatMoneyZar(fullPaymentPreview.total_payout)})
                      </span>
                    ) : null}
                  </label>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="override-mode"
                    checked={allocationMode === "manual"}
                    onChange={() => {
                      setAllocationMode("manual")
                      setShowAdvanced(true)
                      if (autoAllocation && !existingOverride) {
                        setForm(allocationToForm(autoAllocation))
                      }
                    }}
                  />
                  Custom amounts to match my statement
                </label>
              </div>
            </div>

            {allocationMode === "manual" ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="override-note">Note / reason</Label>
                  <Input
                    id="override-note"
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    placeholder="e.g. 31 nights @ R796.70 per owner statement HC1004-26-003"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="override-gross">Gross income this month</Label>
                    <Input
                      id="override-gross"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.accommodation_total}
                      onChange={(e) => setField("accommodation_total", e.target.value)}
                      placeholder="e.g. 24697.70"
                    />
                  </div>
                  <div>
                    <Label htmlFor="override-payout">Payout this month</Label>
                    <Input
                      id="override-payout"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.total_payout}
                      onChange={(e) => setField("total_payout", e.target.value)}
                      placeholder="e.g. 24697.70"
                    />
                  </div>
                </div>

                {previewAmounts ? (
                  <p className="text-xs text-muted-foreground">
                    Management fee ({commissionLabel}):{" "}
                    <span className="font-medium text-slate-700">
                      {formatMoneyZar(previewAmounts.total_management_fee)}
                    </span>
                  </p>
                ) : null}

                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Hide advanced fields" : "Show advanced fields (fees, cleaning)"}
                </Button>

                {showAdvanced ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["channel_commission", "Channel commission"],
                        ["total_management_fee", "Management fee (leave blank to auto-calc)"],
                        ["cleaning_fee", "Cleaning on booking row"],
                        ["payment_processing_fee", "Processing fee"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <Label htmlFor={`override-${key}`}>{label}</Label>
                        <Input
                          id={`override-${key}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={form[key]}
                          onChange={(e) => setField(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div>
            {existingOverride ? (
              <Button type="button" variant="outline" disabled={saving} onClick={removeOverride}>
                Remove override
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving || !booking} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
