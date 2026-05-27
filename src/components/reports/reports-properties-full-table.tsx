"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
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

type SortKey =
  | "propertyName"
  | "ownerName"
  | "bookings"
  | "nights"
  | "occupancyRate"
  | "averageNightlyRate"
  | "grossRevenue"
  | "channelFees"
  | "managementFees"
  | "processingFees"
  | "additionalExpenses"
  | "ownerPayout"
  | "managementFeeRate"

type PropertyRow = ReportsSummaryResponse["propertyBreakdown"][number]

export function ReportsPropertiesFullTable({ data }: { data: ReportsSummaryResponse }) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("grossRevenue")
  const [sortAsc, setSortAsc] = useState(false)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list: PropertyRow[] = data.propertyBreakdown
    if (q) {
      list = list.filter(
        (p) =>
          p.propertyName.toLowerCase().includes(q) ||
          (p.ownerName?.toLowerCase().includes(q) ?? false)
      )
    }

    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp = 0
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv)
      } else if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv
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
          channelFees: acc.channelFees + r.channelFees,
          managementFees: acc.managementFees + r.managementFees,
          processingFees: acc.processingFees + r.processingFees,
          additionalExpenses: acc.additionalExpenses + r.additionalExpenses,
          ownerPayout: acc.ownerPayout + r.ownerPayout,
        }),
        {
          bookings: 0,
          nights: 0,
          grossRevenue: 0,
          channelFees: 0,
          managementFees: 0,
          processingFees: 0,
          additionalExpenses: 0,
          ownerPayout: 0,
        }
      ),
    [rows]
  )

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(key === "propertyName" || key === "ownerName")
    }
  }

  const indicator = (key: SortKey) =>
    sortKey === key ? <span className="ml-1 text-slate-400">{sortAsc ? "↑" : "↓"}</span> : null

  const head = (
    label: string,
    key: SortKey,
    align: "left" | "right" = "right"
  ) => (
    <TableHead
      className={`cursor-pointer text-slate-600 ${align === "right" ? "text-right" : ""}`}
      onClick={() => toggleSort(key)}
    >
      {label}
      {indicator(key)}
    </TableHead>
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-900">Property breakdown</h3>
        <p className="mt-0.5 text-sm text-slate-500">{data.period.label}</p>
        <div className="relative mt-4 w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search property or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-slate-200 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {head("Property", "propertyName", "left")}
              {head("Owner", "ownerName", "left")}
              <TableHead className="text-slate-600">Unit</TableHead>
              {head("Bookings", "bookings")}
              {head("Nights", "nights")}
              {head("Occupancy", "occupancyRate")}
              {head("Avg nightly", "averageNightlyRate")}
              {head("Gross rev", "grossRevenue")}
              {head("Channel fees", "channelFees")}
              {head("Mgmt fees", "managementFees")}
              {head("Processing", "processingFees")}
              {head("Expenses", "additionalExpenses")}
              {head("Owner payout", "ownerPayout")}
              {head("Mgmt fee %", "managementFeeRate")}
              <TableHead className="text-right text-slate-600" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={14} className="py-10 text-center text-slate-500">
                  No properties match your search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="font-medium text-slate-900">{row.propertyName}</TableCell>
                  <TableCell className="text-slate-600">{row.ownerName ?? "—"}</TableCell>
                  <TableCell className="text-slate-500">{row.unitNumber ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.bookings}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.nights}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.occupancyRate.toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.averageNightlyRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.grossRevenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.channelFees)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">
                    {formatMoneyZar(row.managementFees)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.processingFees)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.additionalExpenses)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(row.ownerPayout)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.managementFeeRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={PROPERTY_DETAIL_PATH(row.propertyId)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      View property
                      <ArrowRight className="size-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 ? (
            <TableFooter>
              <TableRow className="bg-slate-50 font-semibold hover:bg-slate-50">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right tabular-nums">{totals.bookings}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.nights}</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(totals.grossRevenue)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(totals.channelFees)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-emerald-700">
                  {formatMoneyZar(totals.managementFees)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(totals.processingFees)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(totals.additionalExpenses)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(totals.ownerPayout)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
    </section>
  )
}
