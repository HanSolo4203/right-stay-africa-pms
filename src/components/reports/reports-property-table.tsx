"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PROPERTY_DETAIL_PATH } from "@/lib/dashboard/dashboard-ui"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ReportsSummaryResponse } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

type SortKey = "revenue" | "occupancy" | "fees" | "bookings"
type ViewMode = "summary" | "detailed"

function OccupancyBar({ rate }: { rate: number }) {
  const pct = Math.min(100, Math.max(0, rate))
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-slate-700">{pct.toFixed(0)}%</span>
    </div>
  )
}

function ShareBar({ share }: { share: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${Math.min(100, share)}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-slate-500">{share.toFixed(1)}%</span>
    </div>
  )
}

export function ReportsPropertyTable({ data }: { data: ReportsSummaryResponse }) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortAsc, setSortAsc] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("summary")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = data.propertyBreakdown
    if (q) {
      list = list.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(q) ||
          (p.ownerName?.toLowerCase().includes(q) ?? false)
      )
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "revenue":
          cmp = a.grossRevenue - b.grossRevenue
          break
        case "occupancy":
          cmp = a.occupancyRate - b.occupancyRate
          break
        case "fees":
          cmp = a.managementFees - b.managementFees
          break
        case "bookings":
          cmp = a.bookings - b.bookings
          break
      }
      return sortAsc ? cmp : -cmp
    })
    return sorted
  }, [data.propertyBreakdown, search, sortKey, sortAsc])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          bookings: acc.bookings + r.bookings,
          nights: acc.nights + r.nights,
          grossRevenue: acc.grossRevenue + r.grossRevenue,
          managementFees: acc.managementFees + r.managementFees,
          ownerPayout: acc.ownerPayout + r.ownerPayout,
        }),
        { bookings: 0, nights: 0, grossRevenue: 0, managementFees: 0, ownerPayout: 0 }
      ),
    [rows]
  )

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null
    return <span className="ml-1 text-slate-400">{sortAsc ? "↑" : "↓"}</span>
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-900">Property performance</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          {data.period.label} · {data.portfolio.totalProperties} properties
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search properties…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-slate-200 pl-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-9 w-[160px] border-slate-200 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="occupancy">Occupancy</SelectItem>
                <SelectItem value="fees">Mgmt fees</SelectItem>
                <SelectItem value="bookings">Bookings</SelectItem>
              </SelectContent>
            </Select>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  viewMode === "summary"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => setViewMode("summary")}
              >
                Summary
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  viewMode === "detailed"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => setViewMode("detailed")}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {viewMode === "detailed" ? <TableHead className="w-8" /> : null}
              <TableHead className="w-8 text-slate-600">#</TableHead>
              <TableHead className="text-slate-600">Property</TableHead>
              <TableHead className="text-slate-600">Owner</TableHead>
              <TableHead
                className="cursor-pointer text-right text-slate-600"
                onClick={() => toggleSort("bookings")}
              >
                Bookings{sortIndicator("bookings")}
              </TableHead>
              <TableHead className="text-right text-slate-600">Nights</TableHead>
              <TableHead
                className="cursor-pointer text-right text-slate-600"
                onClick={() => toggleSort("occupancy")}
              >
                Occupancy{sortIndicator("occupancy")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-slate-600"
                onClick={() => toggleSort("revenue")}
              >
                Gross revenue{sortIndicator("revenue")}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-slate-600"
                onClick={() => toggleSort("fees")}
              >
                Mgmt fees{sortIndicator("fees")}
              </TableHead>
              <TableHead className="text-right text-slate-600">Owner payout</TableHead>
              <TableHead className="text-right text-slate-600">Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={viewMode === "detailed" ? 11 : 10}
                  className="py-10 text-center text-slate-500"
                >
                  No properties match your search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const isOpen = expanded.has(row.propertyId)
                return (
                  <Fragment key={row.propertyId}>
                    <TableRow
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => {
                        if (viewMode === "detailed") toggleExpand(row.propertyId)
                      }}
                    >
                      {viewMode === "detailed" ? (
                        <TableCell className="text-slate-400">
                          {row.platforms.length > 0 ? (
                            isOpen ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )
                          ) : null}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <Link
                          href={PROPERTY_DETAIL_PATH(row.propertyId)}
                          className="font-semibold text-slate-900 hover:text-emerald-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.propertyName}
                        </Link>
                        {row.unitNumber ? (
                          <p className="text-xs text-slate-500">Unit {row.unitNumber}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-slate-600">{row.ownerName ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.bookings}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.nights}</TableCell>
                      <TableCell>
                        <OccupancyBar rate={row.occupancyRate} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(row.grossRevenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-emerald-700">
                        {formatMoneyZar(row.managementFees)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(row.ownerPayout)}
                      </TableCell>
                      <TableCell>
                        <ShareBar share={row.revenueShare} />
                      </TableCell>
                    </TableRow>
                    {viewMode === "detailed" && isOpen
                      ? row.platforms.map((plat) => (
                          <TableRow
                            key={`${row.propertyId}-${plat.platform}`}
                            className="bg-slate-50/80 hover:bg-slate-50"
                          >
                            <TableCell />
                            <TableCell />
                            <TableCell colSpan={2} className="pl-8 text-sm text-slate-600">
                              └ {plat.platform}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {plat.bookings}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {plat.nights}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right tabular-nums text-sm">
                              {formatMoneyZar(plat.revenue)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm text-emerald-700">
                              {formatMoneyZar(plat.managementFees)}
                            </TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                )
              })
            )}
          </TableBody>
          {rows.length > 0 ? (
            <TableFooter>
              <TableRow className="bg-slate-50 font-semibold hover:bg-slate-50">
                <TableCell colSpan={viewMode === "detailed" ? 4 : 3}>Totals</TableCell>
                <TableCell className="text-right tabular-nums">{totals.bookings}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.nights}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(totals.grossRevenue)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-emerald-700">
                  {formatMoneyZar(totals.managementFees)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(totals.ownerPayout)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
    </section>
  )
}
