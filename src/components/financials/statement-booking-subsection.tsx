"use client"

import { format, parseISO } from "date-fns"
import type { ReactNode } from "react"
import { formatChannelLabel } from "@/components/bookings/booking-list"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { StatementBookingTableRow } from "@/lib/clients/statement-booking-ui"
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

export function StatementBookingSubsection<T extends StatementBookingTableRow>({
  title,
  description,
  rows,
  canSelect,
  selectedIds,
  onToggle,
  onOpenDetail,
  includeMode,
  greyed,
  emptyMessage,
  headerActions,
}: {
  title: string
  description?: string
  rows: T[]
  canSelect: boolean
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onOpenDetail?: (b: T) => void
  includeMode: StatementBookingIncludeMode
  greyed?: boolean
  emptyMessage: string
  headerActions?: ReactNode
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
                const paid = Boolean(b.owner_statement_id)
                return (
                  <TableRow key={b.id} className={greyed ? "bg-slate-50/80" : undefined}>
                    {canSelect ? (
                      <TableCell>
                        {includeMode === "next-month" ? (
                          paid ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <input
                              type="checkbox"
                              disabled
                              className="size-4 cursor-not-allowed rounded border-slate-300 opacity-40"
                              title="Check-in is in a future month — switch the period above when you generate that statement."
                              aria-label={`${b.guest_name} cannot be added to this statement period`}
                            />
                          )
                        ) : paid ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <input
                            type="checkbox"
                            className="size-4 rounded border-slate-300"
                            checked={selectedIds.has(b.id)}
                            onChange={() => onToggle(b.id)}
                            aria-label={`Include ${b.guest_name} in statement`}
                          />
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="max-w-[200px]">
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
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(parseISO(b.check_in), "d MMM yyyy")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(parseISO(b.check_out), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>{formatChannelLabel(b.channel_name, b.source)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoneyCell(b.total_payout)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoneyCell(b.cleaning_fee)}</TableCell>
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
                      {paid ? (
                        <Badge className="bg-emerald-100 font-normal text-emerald-900 hover:bg-emerald-100">
                          Paid
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
