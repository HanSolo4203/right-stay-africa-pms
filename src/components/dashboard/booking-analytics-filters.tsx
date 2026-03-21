"use client"

import { format, startOfYear, subDays } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type PropertyOption = { id: string; name: string }

const STATUS_SELECT_VALUES = new Set([
  "all",
  "CONFIRMED,CHECKED_IN,CHECKED_OUT",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
])

type BookingAnalyticsFiltersProps = {
  properties: PropertyOption[]
  initialFrom: string
  initialTo: string
  initialPropertyId: string
  initialSource: string
  initialStatus: string
  initialScope: "all" | "csv"
}

function buildQuery(params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params.toString())
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === "") next.delete(k)
    else next.set(k, v)
  }
  return next.toString()
}

export function BookingAnalyticsFilters({
  properties,
  initialFrom,
  initialTo,
  initialPropertyId,
  initialSource,
  initialStatus,
  initialScope,
}: BookingAnalyticsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const push = useCallback(
    (updates: Record<string, string | null>) => {
      const q = buildQuery(searchParams, updates)
      startTransition(() => {
        router.push(q ? `/dashboard?${q}` : "/dashboard")
      })
    },
    [router, searchParams]
  )

  const today = new Date()
  const end = format(today, "yyyy-MM-dd")

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Booking analytics</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="text-xs"
            onClick={() =>
              push({
                from: format(subDays(today, 29), "yyyy-MM-dd"),
                to: end,
              })
            }
          >
            Last 30 days
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="text-xs"
            onClick={() =>
              push({
                from: format(subDays(today, 89), "yyyy-MM-dd"),
                to: end,
              })
            }
          >
            Last 90 days
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="text-xs"
            onClick={() =>
              push({
                from: format(startOfYear(today), "yyyy-MM-dd"),
                to: end,
              })
            }
          >
            Year to date
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor="ba-from" className="text-xs text-slate-600">
            From
          </Label>
          <input
            id="ba-from"
            type="date"
            defaultValue={initialFrom}
            key={`from-${initialFrom}`}
            disabled={pending}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20"
            onChange={(e) => push({ from: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-to" className="text-xs text-slate-600">
            To
          </Label>
          <input
            id="ba-to"
            type="date"
            defaultValue={initialTo}
            key={`to-${initialTo}`}
            disabled={pending}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20"
            onChange={(e) => push({ to: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-property" className="text-xs text-slate-600">
            Property
          </Label>
          <select
            id="ba-property"
            defaultValue={initialPropertyId}
            key={`prop-${initialPropertyId}`}
            disabled={pending}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20"
            onChange={(e) => push({ property: e.target.value || null })}
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-source" className="text-xs text-slate-600">
            Channel
          </Label>
          <select
            id="ba-source"
            defaultValue={initialSource}
            key={`src-${initialSource}`}
            disabled={pending}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20"
            onChange={(e) => push({ source: e.target.value || null })}
          >
            <option value="">All channels</option>
            <option value="AIRBNB">Airbnb</option>
            <option value="BOOKING_COM">Booking.com</option>
            <option value="DIRECT">Direct</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-status" className="text-xs text-slate-600">
            Status
          </Label>
          <select
            id="ba-status"
            defaultValue={
              STATUS_SELECT_VALUES.has(initialStatus) ? initialStatus : "__custom__"
            }
            key={`st-${initialStatus}`}
            disabled={pending}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20"
            onChange={(e) => push({ status: e.target.value === "all" ? null : e.target.value })}
          >
            {!STATUS_SELECT_VALUES.has(initialStatus) && initialStatus !== "all" ? (
              <option value="__custom__">Custom ({initialStatus})</option>
            ) : null}
            <option value="all">All statuses</option>
            <option value="CONFIRMED,CHECKED_IN,CHECKED_OUT">Active (excl. cancelled)</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked in</option>
            <option value="CHECKED_OUT">Checked out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-scope" className="text-xs text-slate-600">
            Data scope
          </Label>
          <select
            id="ba-scope"
            defaultValue={initialScope}
            key={`sc-${initialScope}`}
            disabled={pending}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20"
            onChange={(e) => push({ scope: e.target.value === "csv" ? "csv" : null })}
          >
            <option value="all">All bookings</option>
            <option value="csv">CSV imports only</option>
          </select>
        </div>
      </div>
      {pending ? <p className="text-xs text-slate-500">Updating…</p> : null}
    </div>
  )
}
