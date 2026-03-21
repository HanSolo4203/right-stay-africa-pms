"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type PropertyOption = {
  id: string
  name: string
  uplisting_id: string | null
}

type QuickLinkPropertyModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  uplistingId: string
  nickname: string
  onLinked?: (uplistingId: string) => void
}

export function QuickLinkPropertyModal({
  open,
  onOpenChange,
  uplistingId,
  nickname,
  onLinked,
}: QuickLinkPropertyModalProps) {
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loadError, setLoadError] = useState("")
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState("")
  const [linkedOk, setLinkedOk] = useState(false)

  const resetState = useCallback(() => {
    setSelectedPropertyId("")
    setLinkError("")
    setLinkedOk(false)
    setLoadError("")
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }

    resetState()

    let cancelled = false
    setLoadError("")

    void (async () => {
      try {
        const res = await fetch("/api/properties", { credentials: "include" })
        if (!res.ok) {
          if (!cancelled) setLoadError("Could not load properties.")
          return
        }
        const data = (await res.json()) as { properties?: PropertyOption[] }
        if (!cancelled) setProperties(data.properties ?? [])
      } catch {
        if (!cancelled) setLoadError("Could not load properties.")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, resetState])

  const newPropertyHref = `/dashboard/properties/new?name=${encodeURIComponent(nickname || "New property")}&uplisting_id=${encodeURIComponent(uplistingId)}`

  const onLink = async () => {
    if (!selectedPropertyId) {
      setLinkError("Select a property to link.")
      return
    }
    setLinkError("")
    setLinking(true)
    try {
      const res = await fetch("/api/properties/link-uplisting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          property_db_id: selectedPropertyId,
          uplisting_id: uplistingId,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setLinkError(data.error ?? "Link failed.")
        return
      }
      setLinkedOk(true)
      onLinked?.(uplistingId)
    } catch {
      setLinkError("Network error.")
    } finally {
      setLinking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Set up property</DialogTitle>
          <DialogDescription>
            Link this Uplisting listing to an existing Right Stay property, or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Uplisting ID</span>
            <span className="font-mono font-medium text-slate-900">{uplistingId}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">CSV nickname</span>
            <span className="max-w-[240px] truncate text-right font-medium text-slate-900">
              {nickname || "—"}
            </span>
          </div>
        </div>

        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        {linkedOk ? (
          <Alert>
            <AlertTitle>Linked</AlertTitle>
            <AlertDescription>
              This Uplisting ID is now saved on the property. Close this dialog and run the CSV import
              again to bring in the skipped bookings.
            </AlertDescription>
          </Alert>
        ) : null}

        {!linkedOk ? (
          <>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Option A — Link to existing property</h4>
                <p className="text-xs text-slate-600">
                  Sets <span className="font-mono">{uplistingId}</span> on the property you choose.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-property-select">Property</Label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger id="link-property-select" className="w-full">
                    <SelectValue placeholder="Choose a property…" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.uplisting_id ? ` (Uplisting: ${p.uplisting_id})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {linkError ? <p className="text-sm text-red-600">{linkError}</p> : null}
              <Button
                type="button"
                className="w-full bg-green-700 text-white hover:bg-green-800"
                disabled={linking || properties.length === 0}
                onClick={() => void onLink()}
              >
                {linking ? "Linking…" : "Link"}
              </Button>
            </div>

            <div className="flex items-center gap-2 py-1">
              <Separator className="flex-1" />
              <span className="text-xs text-slate-400">or</span>
              <Separator className="flex-1" />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Option B — Create new property</h4>
              <p className="text-xs text-slate-600">
                Opens the add-property form with name and Uplisting ID filled from this CSV row.
              </p>
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href={newPropertyHref} onClick={() => onOpenChange(false)}>
                  Create new property
                </Link>
              </Button>
            </div>
          </>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
