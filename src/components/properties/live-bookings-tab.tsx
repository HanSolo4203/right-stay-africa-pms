"use client"

import { useCallback, useEffect, useState } from "react"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type LiveBookingRow = {
  id: string
  guestName: string
  checkIn: string
  checkOut: string
  nights: number
  platform: string | null
  status: string
  totalPrice: number | null
  currency: string
}

type LiveBookingsTabProps = {
  propertyId: string
  uplistingLinked: boolean
}

function formatMoney(amount: number | null, currency: string) {
  if (amount == null || !Number.isFinite(amount)) return "—"
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency === "ZAR" ? "ZAR" : currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM yyyy")
  } catch {
    return iso.split("T")[0] ?? iso
  }
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase()
  if (s === "confirmed" || s === "checked_in" || s === "checked_out") {
    return "bg-green-100 text-green-800 hover:bg-green-100"
  }
  if (s === "cancelled") {
    return "bg-red-100 text-red-800 hover:bg-red-100"
  }
  if (s === "pending") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100"
  }
  return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ")
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function LiveBookingsTab({ propertyId, uplistingLinked }: LiveBookingsTabProps) {
  const [bookings, setBookings] = useState<LiveBookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadBookings = useCallback(async () => {
    const res = await fetch(`/api/bookings?propertyId=${encodeURIComponent(propertyId)}`)
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? "Failed to load bookings.")
    }
    const data = (await res.json()) as {
      bookings: LiveBookingRow[]
      lastSyncedAt: string | null
    }
    setBookings(data.bookings)
    setLastSyncedAt(data.lastSyncedAt)
  }, [propertyId])

  const syncFromUplisting = useCallback(async () => {
    const res = await fetch(
      `/api/uplisting/sync?propertyId=${encodeURIComponent(propertyId)}`
    )
    const body = (await res.json().catch(() => ({}))) as {
      error?: string
      lastSyncedAt?: string
    }
    if (!res.ok) {
      throw new Error(body.error ?? "Sync failed.")
    }
    if (body.lastSyncedAt) {
      setLastSyncedAt(body.lastSyncedAt)
    }
  }, [propertyId])

  const refresh = useCallback(
    async (options?: { sync?: boolean }) => {
      setError(null)
      if (options?.sync) setSyncing(true)
      else setLoading(true)

      try {
        if (options?.sync && uplistingLinked) {
          await syncFromUplisting()
        }
        await loadBookings()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.")
      } finally {
        setLoading(false)
        setSyncing(false)
      }
    },
    [loadBookings, syncFromUplisting, uplistingLinked]
  )

  useEffect(() => {
    void refresh({ sync: uplistingLinked })
  }, [refresh, uplistingLinked])

  const lastSyncedLabel = lastSyncedAt
    ? format(parseISO(lastSyncedAt), "dd MMM yyyy, HH:mm")
    : null

  return (
    <Card className="bg-white">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Live Bookings</h3>
            <p className="text-xs text-slate-500">
              Real-time data from Uplisting webhooks and API sync.
            </p>
            {lastSyncedLabel ? (
              <p className="mt-1 text-xs text-slate-500">Last synced: {lastSyncedLabel}</p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading || syncing || !uplistingLinked}
            onClick={() => void refresh({ sync: true })}
          >
            <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {!uplistingLinked ? (
          <p className="text-sm text-amber-700">
            Link this property to Uplisting (set uplisting ID) to sync live bookings.
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {loading ? (
          <TableSkeleton />
        ) : bookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings found for this property.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total (ZAR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const nights =
                  b.nights > 0
                    ? b.nights
                    : Math.max(
                        0,
                        differenceInCalendarDays(parseISO(b.checkOut), parseISO(b.checkIn))
                      )
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.guestName}</TableCell>
                    <TableCell>{formatDate(b.checkIn)}</TableCell>
                    <TableCell>{formatDate(b.checkOut)}</TableCell>
                    <TableCell>{nights}</TableCell>
                    <TableCell className="capitalize">{b.platform ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(b.status)} variant="outline">
                        {statusLabel(b.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.totalPrice, b.currency)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
