"use client"

import { useMemo, useState } from "react"
import { FileDown, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  formatPeriodTabLabel,
  periodTabToMonthYear,
  statementPeriodEndLabel,
  type StatementPeriodTab,
} from "@/lib/clients/statement-period-tabs"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ClientStatementSummary, PropertyStatement } from "@/types/statement"

export type StatementOverviewRow = {
  clientId: string
  clientName: string
  propertyId: string
  propertyName: string
  month: number
  year: number
  periodEndLabel: string
  status: "none" | "DRAFT" | "FINAL"
  amount: number | null
  hasPdf: boolean
  fileUrl: string | null
  fileName: string | null
}

export function flattenClientsToOverviewRows(
  clients: ClientStatementSummary[],
  month: number,
  year: number
): StatementOverviewRow[] {
  const periodEndLabel = statementPeriodEndLabel(month, year)
  const rows: StatementOverviewRow[] = []

  for (const client of clients) {
    for (const property of client.properties) {
      rows.push(propertyToOverviewRow(client, property, month, year, periodEndLabel))
    }
  }

  return rows.sort((a, b) => {
    const clientCmp = a.clientName.localeCompare(b.clientName, "en-ZA")
    if (clientCmp !== 0) return clientCmp
    return a.propertyName.localeCompare(b.propertyName, "en-ZA")
  })
}

function propertyToOverviewRow(
  client: ClientStatementSummary,
  property: PropertyStatement,
  month: number,
  year: number,
  periodEndLabel: string
): StatementOverviewRow {
  const status = property.existingStatementStatus ?? "none"
  const hasStatement = property.existingStatementId != null
  const amount =
    hasStatement || property.lines.length > 0 ? property.totals.netToOwner : null

  return {
    clientId: client.clientId,
    clientName: client.clientName,
    propertyId: property.propertyId,
    propertyName: property.propertyName,
    month,
    year,
    periodEndLabel,
    status,
    amount,
    hasPdf: property.hasPdf,
    fileUrl: property.existingStatementFileUrl,
    fileName: property.existingStatementFileName,
  }
}

function statusBadge(status: StatementOverviewRow["status"]) {
  if (status === "DRAFT") {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 font-normal text-amber-900">
        Draft
      </Badge>
    )
  }
  if (status === "FINAL") {
    return (
      <Badge variant="outline" className="font-normal text-slate-700">
        Finalised
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-slate-200 font-normal text-slate-500">
      Not started
    </Badge>
  )
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

function isSamePeriod(a: { month: number; year: number }, b: { month: number; year: number }) {
  return a.month === b.month && a.year === b.year
}

type ClientsStatementsOverviewProps = {
  periodTab: StatementPeriodTab
  onPeriodTabChange: (tab: StatementPeriodTab) => void
  /** When viewing a month outside prev/current/future tabs. */
  customPeriod?: { month: number; year: number } | null
  onCustomPeriodChange?: (month: number, year: number) => void
  rows: StatementOverviewRow[]
  loading?: boolean
  onOpenStatement: (row: StatementOverviewRow) => void
  onDownloadPdf?: (row: StatementOverviewRow) => void
}

export function ClientsStatementsOverview({
  periodTab,
  onPeriodTabChange,
  customPeriod,
  onCustomPeriodChange,
  rows,
  loading,
  onOpenStatement,
  onDownloadPdf,
}: ClientsStatementsOverviewProps) {
  const now = new Date()
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)
  const viewingCustom =
    customPeriod != null &&
    !isSamePeriod(customPeriod, periodTabToMonthYear("previous")) &&
    !isSamePeriod(customPeriod, periodTabToMonthYear("current")) &&
    !isSamePeriod(customPeriod, periodTabToMonthYear("future"))
  const [clientFilter, setClientFilter] = useState("")
  const [propertyFilter, setPropertyFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "none" | "DRAFT" | "FINAL">("all")

  const filtered = useMemo(() => {
    const clientQ = clientFilter.trim().toLowerCase()
    const propQ = propertyFilter.trim().toLowerCase()
    return rows.filter((row) => {
      if (clientQ && !row.clientName.toLowerCase().includes(clientQ)) return false
      if (propQ && !row.propertyName.toLowerCase().includes(propQ)) return false
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      return true
    })
  }, [rows, clientFilter, propertyFilter, statusFilter])

  const resetFilters = () => {
    setClientFilter("")
    setPropertyFilter("")
    setStatusFilter("all")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Tabs
          value={viewingCustom ? "" : periodTab}
          onValueChange={(v) => {
            if (v) onPeriodTabChange(v as StatementPeriodTab)
          }}
        >
          <TabsList className="h-auto flex-wrap bg-white">
            <TabsTrigger value="previous" className="data-[state=active]:bg-slate-100">
              Previous
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                ({formatPeriodTabLabel("previous")})
              </span>
            </TabsTrigger>
            <TabsTrigger value="current" className="data-[state=active]:bg-emerald-50">
              Current
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                ({formatPeriodTabLabel("current")})
              </span>
            </TabsTrigger>
            <TabsTrigger value="future" className="data-[state=active]:bg-slate-100">
              Future
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                ({formatPeriodTabLabel("future")})
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {onCustomPeriodChange && customPeriod ? (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs font-medium text-slate-500">Other period</span>
            <Select
              value={String(customPeriod.month)}
              onValueChange={(v) => onCustomPeriodChange(Number(v), customPeriod.year)}
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((label, i) => (
                  <SelectItem key={label} value={String(i + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(customPeriod.year)}
              onValueChange={(v) => onCustomPeriodChange(customPeriod.month, Number(v))}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-[160px] flex-1 space-y-1">
          <label className="text-xs font-medium text-slate-500">Client name</label>
          <Input
            placeholder="Filter clients…"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="min-w-[160px] flex-1 space-y-1">
          <label className="text-xs font-medium text-slate-500">Property</label>
          <Input
            placeholder="Filter properties…"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Statement status</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="none">Not started</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="FINAL">Finalised</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
          Reset
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client name</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Statement end</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">
                  Loading statements…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">
                  No properties match your filters for {formatPeriodTabLabel(periodTab)}.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={`${row.clientId}-${row.propertyId}`}>
                  <TableCell className="font-medium text-slate-900">{row.clientName}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-slate-700">
                    {row.propertyName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {row.periodEndLabel}
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-violet-200 bg-violet-50 font-normal text-violet-800"
                    >
                      Payout
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-900">
                    {row.amount != null && row.amount > 0
                      ? formatMoneyZar(row.amount)
                      : row.status === "none"
                        ? "—"
                        : formatMoneyZar(row.amount ?? 0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-500"
                        disabled
                        aria-label="Email statement (coming soon)"
                        title="Email (coming soon)"
                      >
                        <Mail className="size-4" />
                      </Button>
                      {row.hasPdf && onDownloadPdf ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-600"
                          aria-label="Download PDF"
                          onClick={() => onDownloadPdf(row)}
                        >
                          <FileDown className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-300"
                          disabled
                          aria-label="No PDF on file"
                        >
                          <FileDown className="size-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800"
                        onClick={() => onOpenStatement(row)}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {rows.length} propert{rows.length === 1 ? "y" : "ies"} for{" "}
        {viewingCustom && customPeriod
          ? new Date(customPeriod.year, customPeriod.month - 1, 1).toLocaleString("en-ZA", {
              month: "long",
              year: "numeric",
            })
          : formatPeriodTabLabel(periodTab)}
        . Open <strong>View</strong> to edit bookings, expenses, or regenerate a PDF.
      </p>
    </div>
  )
}

// Fix missing imports - I used useState and useMemo without importing
