"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import type { StatementAllocationUiMode } from "@/lib/clients/statement-booking-allocation-ui"
import type { PropertyStatement } from "@/types/statement"

export type { StatementAllocationUiMode } from "@/lib/clients/statement-booking-allocation-ui"
export { overrideRowToUiMode } from "@/lib/clients/statement-booking-allocation-ui"

export function StatementAllocationModeSelect({
  value,
  clientId,
  propertyId,
  bookingId,
  month,
  year,
  disabled,
  onSaved,
  onRequestManualEdit,
}: {
  value: StatementAllocationUiMode
  clientId: string
  propertyId: string
  bookingId: string
  month: number
  year: number
  disabled?: boolean
  onSaved: (statement?: PropertyStatement) => void
  /** When user picks manual custom amounts, open the override dialog. */
  onRequestManualEdit?: () => void
}) {
  const [saving, setSaving] = useState(false)

  const saveMode = async (mode: StatementAllocationUiMode) => {
    if (mode === "manual") {
      onRequestManualEdit?.()
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/clients/statements/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          propertyId,
          bookingId,
          month,
          year,
          allocationMode: mode,
        }),
      })
      const payload = (await res.json()) as {
        error?: string
        statement?: PropertyStatement
      }
      if (!res.ok) throw new Error(payload.error ?? "Failed to update allocation.")
      toast.success(
        mode === "prorated"
          ? "Using pro-rated amounts for this month."
          : "Using full CSV payment for this month."
      )
      onSaved(payload.statement)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update allocation.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Select
      value={value}
      disabled={disabled || saving}
      onValueChange={(v) => void saveMode(v as StatementAllocationUiMode)}
    >
      <SelectTrigger
        className="h-7 w-full min-w-[7.5rem] border-slate-200 bg-white px-2 text-xs text-slate-900"
        aria-label="Payment allocation for this month"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="prorated">Pro-rated</SelectItem>
        <SelectItem value="full_payment">Full payment</SelectItem>
        <SelectItem value="manual">Custom amounts…</SelectItem>
      </SelectContent>
    </Select>
  )
}
