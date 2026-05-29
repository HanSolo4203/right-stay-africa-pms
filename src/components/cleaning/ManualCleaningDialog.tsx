"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
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
import { formatCleaningPropertyLabel } from "@/lib/cleaning/format-property-label"
import type { CleaningStatus, CleaningType } from "@/lib/cleaning/serialize"
import { toast } from "@/components/ui/toast"

type PropertyOption = {
  id: string
  name: string
  unit_number: string | null
}

type ManualCleaningDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  defaultPropertyId?: string
  defaultScheduledDate?: string
}

export function ManualCleaningDialog({
  open,
  onOpenChange,
  onCreated,
  defaultPropertyId = "",
  defaultScheduledDate,
}: ManualCleaningDialogProps) {
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [saving, setSaving] = useState(false)
  const [propertyId, setPropertyId] = useState(defaultPropertyId)
  const [scheduledDate, setScheduledDate] = useState(
    defaultScheduledDate ?? format(new Date(), "yyyy-MM-dd"),
  )
  const [type, setType] = useState<CleaningType>("manual")
  const [status, setStatus] = useState<CleaningStatus>("scheduled")
  const [notes, setNotes] = useState("")
  const [cleanerName, setCleanerName] = useState("")

  useEffect(() => {
    if (!open) return
    setPropertyId(defaultPropertyId)
    setScheduledDate(defaultScheduledDate ?? format(new Date(), "yyyy-MM-dd"))
    setType("manual")
    setStatus("scheduled")
    setNotes("")
    setCleanerName("")
  }, [open, defaultPropertyId, defaultScheduledDate])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoadingProperties(true)
      try {
        const res = await fetch("/api/properties")
        if (!res.ok) return
        const data = (await res.json()) as { properties?: PropertyOption[] }
        if (!cancelled) setProperties(data.properties ?? [])
      } finally {
        if (!cancelled) setLoadingProperties(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open])

  const onSubmit = async () => {
    if (!propertyId) {
      toast.error("Select a property.")
      return
    }
    if (!scheduledDate) {
      toast.error("Select a date.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          scheduledDate,
          type,
          status,
          notes: notes.trim() || undefined,
          cleanerName: cleanerName.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add cleaning task.")
        return
      }
      toast.success("Manual cleaning task added.")
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error("Failed to add cleaning task.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add manual cleaning</DialogTitle>
          <DialogDescription>
            Schedule a one-off clean for a property without linking it to a booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="manual-clean-property">Property</Label>
            {loadingProperties ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading properties…
              </div>
            ) : (
              <select
                id="manual-clean-property"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatCleaningPropertyLabel(p.name, p.unit_number)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-clean-date">Scheduled date</Label>
              <Input
                id="manual-clean-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-clean-type">Type</Label>
              <select
                id="manual-clean-type"
                value={type}
                onChange={(e) => setType(e.target.value as CleaningType)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="manual">Manual / ad-hoc</option>
                <option value="checkout">Checkout</option>
                <option value="midstay">Mid-stay</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-clean-status">Status</Label>
            <select
              id="manual-clean-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CleaningStatus)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-clean-cleaner">Cleaner (optional)</Label>
            <Input
              id="manual-clean-cleaner"
              value={cleanerName}
              onChange={(e) => setCleanerName(e.target.value)}
              placeholder="Name or team"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-clean-notes">Notes (optional)</Label>
            <Textarea
              id="manual-clean-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deep clean between guests, owner request…"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter showCloseButton={false}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-green-700 text-white hover:bg-green-800"
            disabled={saving || loadingProperties}
            onClick={() => void onSubmit()}
          >
            {saving ? "Saving…" : "Add cleaning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
