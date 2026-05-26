"use client"

import { format, parseISO } from "date-fns"
import { Pencil } from "lucide-react"
import type { ReactNode } from "react"
import { formatChannelLabel } from "@/components/bookings/booking-list"
import {
  StatementManualOverrideBadge,
  StatementProrationBadge,
} from "@/components/clients/statement-proration-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  canIncludeBookingOnStatement,
  clientBookingRowToInput,
  isBookingOnOtherStatement,
  type StatementBookingTableRow,
} from "@/lib/clients/statement-booking-ui"
import { allocationsForStatementMonth, prorationMetaForBookingInMonth } from "@/lib/statement-calculator"
import type { ClientStatementBookingRow, StatementBookingOverrideRow } from "@/types/statement"
import { cn } from "@/lib/utils"

export type StatementBookingIncludeMode = "statement-eligible" | "next-month"

function formatMoneyCell(s: string | null | undefined): string {
  if (s == null || s === "") return "—"
  const n = Number(s)
  if (!Number.isFinite(n)) return s
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(n)
}

function proratedDisplayAmount(
  value: string | null | undefined,
  ratio: number,
  isProrated: boolean
): string | null | undefined {
  if (!isProrated || value == null || value === "") return value
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return String(Math.round(n * ratio * 100) / 100)
}

export function StatementBookingSubsection<T extends StatementBookingTableRow>({
  title,
  description,
  rows,
  canSelect,
  selectedIds,
  onToggle,
  onOpenDetail,
  includeMode,
  currentStatementId = null,
  greyed,
  emptyMessage,
  headerActions,
  statementYear,
  statementMonth,
  bookingOverrides = [],
  onEditOverride,
  canEditOverrides = false,
}: {
  title: string
  description?: string
  rows: T[]
  canSelect: boolean
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onOpenDetail?: (b: T) => void
  includeMode: StatementBookingIncludeMode
  /** When editing a draft/final statement, bookings on this id stay selectable. */
  currentStatementId?: string | null
  greyed?: boolean
  emptyMessage: string
  headerActions?: ReactNode
  /** When set, pro-rated amounts and badges are shown for multi-month stays. */
  statementYear?: number
  statementMonth?: number
  bookingOverrides?: StatementBookingOverrideRow[]
  onEditOverride?: (booking: ClientStatementBookingRow) => void
  canEditOverrides?: boolean
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-4",
        greyed ? "border-dashed border-slate-200 bg-slate-50/70 text-slate-600" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={cn("text-sm font-semibold", greyed ? "text-slate-600" : "text-slate-900")}>{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white/50 p-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className={greyed ? "bg-slate-50" : undefined}>
                {canSelect ? <TableHead className="w-10">Include</TableHead> : null}
                <TableHead>Guest</TableHead>
                {onEditOverride && includeMode === "statement-eligible" ? (
                  <TableHead className="w-[88px]">Amounts</TableHead>
                ) : null}
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead className="text-right">Cleaning</TableHead>
                <TableHead>CSV</TableHead>
                <TableHead>Paid out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => {
                const onOtherStatement = isBookingOnOtherStatement(
                  b.owner_statement_id,
                  currentStatementId
                )
                const onThisStatement = Boolean(
                  b.owner_statement_id &&
                    currentStatementId &&
                    b.owner_statement_id === currentStatementId
                )
                const canInclude = canIncludeBookingOnStatement(
                  b.owner_statement_id,
                  currentStatementId,
                  includeMode
                )
                const rowOverride = bookingOverrides.find((o) => o.booking_id === b.id)
                const allocation =
                  statementYear != null && statementMonth != null
                    ? allocationsForStatementMonth(
                        [clientBookingRowToInput(b as unknown as ClientStatementBookingRow)],
                        statementYear,
                        statementMonth,
                        bookingOverrides
                      )[0]
                    : null
                const prorationMeta =
                  statementYear != null && statementMonth != null
                    ? prorationMetaForBookingInMonth(
                        {
                          check_in: parseISO(b.check_in),
                          check_out: parseISO(b.check_out),
                        },
                        statementYear,
                        statementMonth
                      )
                    : null
                const payoutDisplay =
                  allocation != null
                    ? String(allocation.total_payout)
                    : proratedDisplayAmount(
                        b.total_payout,
                        prorationMeta?.ratio ?? 1,
                        prorationMeta?.isProrated ?? false
                      )
                const cleaningDisplay =
                  allocation != null
                    ? String(allocation.cleaning_fee)
                    : proratedDisplayAmount(
                        b.cleaning_fee,
                        prorationMeta?.ratio ?? 1,
                        prorationMeta?.isProrated ?? false
                      )
                return (
                  <TableRow key={b.id} className={greyed ? "bg-slate-50/80" : undefined}>
                    {canSelect ? (
                      <TableCell>
                        {canInclude ? (
                          <input
                            type="checkbox"
                            className="size-4 rounded border-slate-300"
                            checked={selectedIds.has(b.id)}
                            onChange={() => onToggle(b.id)}
                            aria-label={`Include ${b.guest_name} in statement`}
                          />
                        ) : includeMode === "next-month" && onOtherStatement ? (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Already on another period's statement — open that month to change it."
                          >
                            —
                          </span>
                        ) : includeMode === "next-month" ? (
                          <input
                            type="checkbox"
                            disabled
                            className="size-4 cursor-not-allowed rounded border-slate-300 opacity-40"
                            title="Check-in is in a future month — switch the period above when you generate that statement."
                            aria-label={`${b.guest_name} cannot be added to this statement period`}
                          />
                        ) : onOtherStatement ? (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Already included on another period's statement."
                          >
                            —
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          {onOpenDetail ? (
                            <button
                              type="button"
                              className="max-w-full cursor-pointer text-left font-medium text-slate-900 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => onOpenDetail(b)}
                            >
                              {b.guest_name}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-900">{b.guest_name}</span>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatChannelLabel(b.channel_name, b.source)} ·{" "}
                            {format(parseISO(b.check_in), "d MMM")} –{" "}
                            {format(parseISO(b.check_out), "d MMM yyyy")}
                          </p>
                          {rowOverride ? (
                            <StatementManualOverrideBadge note={rowOverride.note} />
                          ) : prorationMeta?.isProrated &&
                            statementYear != null &&
                            statementMonth != null ? (
                            <StatementProrationBadge
                              checkIn={b.check_in}
                              checkOut={b.check_out}
                              nights={prorationMeta.nights}
                              totalNights={prorationMeta.totalNights}
                              statementMonth={statementMonth}
                              statementYear={statementYear}
                            />
                          ) : null}
                          {onEditOverride && includeMode === "statement-eligible" ? (
                            <button
                              type="button"
                              className="mt-1 block text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline"
                              onClick={() => onEditOverride(b as unknown as ClientStatementBookingRow)}
                            >
                              Edit amounts
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    {onEditOverride && includeMode === "statement-eligible" ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 whitespace-nowrap px-2 text-xs"
                          disabled={canEditOverrides === false}
                          title={
                            canEditOverrides === false
                              ? "Assign a client to this property before editing amounts."
                              : undefined
                          }
                          onClick={() => onEditOverride(b as unknown as ClientStatementBookingRow)}
                        >
                          <Pencil className="mr-1 size-3" />
                          Edit
                        </Button>
                      </TableCell>
                    ) : null}
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(parseISO(b.check_in), "d MMM yyyy")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(parseISO(b.check_out), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>{formatChannelLabel(b.channel_name, b.source)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoneyCell(payoutDisplay)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoneyCell(cleaningDisplay)}</TableCell>
                    <TableCell>
                      {b.csv_imported_at ? (
                        <Badge variant="outline" className="font-normal">
                          CSV
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {onOtherStatement ? (
                        <Badge className="bg-emerald-100 font-normal text-emerald-900 hover:bg-emerald-100">
                          Paid
                        </Badge>
                      ) : onThisStatement ? (
                        <Badge variant="outline" className="border-slate-300 font-normal text-slate-700">
                          On statement
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          Open
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
