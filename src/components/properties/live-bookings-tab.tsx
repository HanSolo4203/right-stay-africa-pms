"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  differenceInCalendarDays,
  format,
  formatISO,
  isAfter,
  isBefore,
  lastDayOfMonth,
  parseISO,
  startOfMonth,
} from "date-fns"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type BookingOrigin = "webhook" | "api_sync"

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
  accommodationTotal: number | null
  cleaningFee: number | null
  channelCommission: number | null
  managementFee: number | null
  payout: number | null
  origin: BookingOrigin
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
  if (s === "modified") {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100"
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

function computeMonthlyStats(bookings: LiveBookingRow[]) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = lastDayOfMonth(now)
  const daysInMonth = differenceInCalendarDays(
    // add 1 day to include last day
    new Date(formatISO(monthEnd, { representation: "date" }) + "T12:00:00"),
    new Date(formatISO(monthStart, { representation: "date" }) + "T12:00:00")
  )

  const totalBookings = bookings.length
  let bookingsThisMonth = 0
  let bookedNightsThisMonth = 0

  for (const b of bookings) {
    const checkIn = parseISO(b.checkIn)
    const checkOut = parseISO(b.checkOut)

    const overlapsMonth =
      (isBefore(checkIn, monthEnd) || +checkIn === +monthEnd) &&
      (isAfter(checkOut, monthStart) || +checkOut === +monthStart)

    if (!overlapsMonth) continue
    bookingsThisMonth += 1

    const start = isBefore(checkIn, monthStart) ? monthStart : checkIn
    const end = isAfter(checkOut, monthEnd) ? monthEnd : checkOut
    const nights = Math.max(0, differenceInCalendarDays(end, start))
    bookedNightsThisMonth += nights
  }

  const occupancy =
    daysInMonth > 0 ? Math.min(100, Math.round((bookedNightsThisMonth / daysInMonth) * 100)) : 0

  return {
    totalBookings,
    bookingsThisMonth,
    bookedNightsThisMonth,
    occupancy,
  }
}

export function LiveBookingsTab({ propertyId, uplistingLinked }: LiveBookingsTabProps) {
  const [bookings, setBookings] = useState<LiveBookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [webhookModalOpen, setWebhookModalOpen] = useState(false)

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
    const res = await fetch("/api/uplisting/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ propertyId }),
    })
    const body = (await res.json().catch(() => ({}))) as {
      error?: string
      lastSyncedAt?: string
      synced?: number
      created?: number
      updated?: number
    }
    if (!res.ok) {
      throw new Error(body.error ?? "Sync failed.")
    }
    if (body.lastSyncedAt) {
      setLastSyncedAt(body.lastSyncedAt)
    }
    const syncedCount =
      typeof body.synced === "number"
        ? body.synced
        : (body.created ?? 0) + (body.updated ?? 0)
    toast.success(`Synced ${syncedCount} bookings`)
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

  const stats = useMemo(() => computeMonthlyStats(bookings), [bookings])

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "")
  const webhookUrl = `${appUrl || ""}/api/webhooks/uplisting`
  const showRegisterWebhook = uplistingLinked && !lastSyncedAt

  return (
    <Card className="bg-white">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Live Bookings</h3>
            <p className="text-xs text-slate-500">
              Real-time data from Uplisting webhooks and API sync.
            </p>
            {uplistingLinked ? (
              <p className="mt-1 text-xs text-slate-600">
                {lastSyncedLabel ? `Last synced: ${lastSyncedLabel}` : "Never synced"}
              </p>
            ) : null}
          </div>
          {uplistingLinked ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || syncing}
                onClick={() => void refresh({ sync: true })}
              >
                <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
              {showRegisterWebhook ? (
                <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline">
                      Register webhook
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Register your webhook with Uplisting</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm text-slate-700">
                      <div>
                        <p className="font-medium">1. Log into Uplisting and go to:</p>
                        <p className="mt-1 text-slate-600">Connect → Webhook</p>
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Webhook URL
                          </p>
                          <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
                            <span className="flex-1 truncate text-xs">{webhookUrl}</span>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(webhookUrl)
                                  toast.success("Webhook URL copied.")
                                } catch {
                                  toast.error("Failed to copy webhook URL.")
                                }
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium">2. In the Uplisting webhook settings:</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                          <li>Paste the URL above as your endpoint.</li>
                          <li>
                            Select events to subscribe to:{" "}
                            <span className="font-mono text-xs">
                              booking.created / reservation.created, booking.modified /
                              reservation.modified, booking.cancelled / reservation.cancelled
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium">
                          3. Copy your webhook secret from Uplisting and add it to your environment
                          variables:
                        </p>
                        <div className="mt-2 rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-700">
                          UPLISTING_WEBHOOK_SECRET=your_secret_here
                        </div>
                      </div>

                      <div>
                        <p className="font-medium">4. Test the connection:</p>
                        <p className="mt-1 text-slate-600">
                          Use the button below to call{" "}
                          <span className="font-mono text-xs">
                            /api/webhooks/uplisting/test
                          </span>{" "}
                          and confirm the endpoint is live.
                        </p>
                      </div>
                    </div>
                    <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/webhooks/uplisting/test")
                            if (!res.ok) {
                              throw new Error(`Status ${res.status}`)
                            }
                            toast.success("Webhook test endpoint is reachable.")
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? `Test failed: ${e.message}`
                                : "Test request failed."
                            )
                          }
                        }}
                      >
                        Test webhook
                      </Button>
                      <Button type="button" variant="default" onClick={() => setWebhookModalOpen(false)}>
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          ) : null}
        </div>

        {!uplistingLinked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Link this property to Uplisting to see live bookings.</p>
            <p className="mt-1 text-amber-800/80">
              Add the Uplisting Property ID in the property settings page, then return here to run
              the first sync.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {uplistingLinked && bookings.length > 0 ? (
          <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-700 sm:grid-cols-4">
            <div>
              <p className="font-medium text-slate-500">Total bookings</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{stats.totalBookings}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">This month</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {stats.bookingsThisMonth}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Booked nights this month</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {stats.bookedNightsThisMonth}
              </p>
            </div>
              <div>
                <p className="font-medium text-slate-500">Occupancy this month</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{stats.occupancy}%</p>
              </div>
          </div>
        ) : null}

        {loading ? (
          <TableSkeleton />
        ) : bookings.length === 0 ? (
          <p className="text-sm text-slate-500">
            No bookings synced yet. Click &quot;Sync now&quot; to pull your first batch from
            Uplisting, then webhooks will keep this updated automatically.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Check in</TableHead>
                <TableHead>Check out</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Accommodation</TableHead>
                <TableHead>Cleaning</TableHead>
                <TableHead>Channel fee</TableHead>
                <TableHead>Mgmt fee</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Status</TableHead>
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
                const sourceLabel = b.origin === "webhook" ? "Live" : "Synced"
                const sourceClass =
                  b.origin === "webhook"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"

                return (
                  <TableRow key={b.id}>
                    <TableCell className="relative font-medium">
                      <div>{b.guestName}</div>
                      <span
                        className={`absolute right-1 top-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceClass}`}
                      >
                        {b.origin === "webhook" ? (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ) : null}
                        {sourceLabel}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(b.checkIn)}</TableCell>
                    <TableCell>{formatDate(b.checkOut)}</TableCell>
                    <TableCell>{nights}</TableCell>
                    <TableCell className="capitalize">{b.platform ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.accommodationTotal, b.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.cleaningFee, b.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.channelCommission, b.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.managementFee, b.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.payout, b.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(b.status)} variant="outline">
                        {statusLabel(b.status)}
                      </Badge>
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
