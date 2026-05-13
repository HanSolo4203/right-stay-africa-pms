"use client"

import { BookingStatus } from "@prisma/client"
import { format, parseISO } from "date-fns"
import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  deleteOwnerStatementDraft,
  finalizeOwnerStatement,
  saveOwnerStatementDraft,
} from "@/app/(dashboard)/properties/[id]/statements/owner-statement-actions"
import type { BookingListRow } from "@/components/bookings/booking-list"
import { formatChannelLabel } from "@/components/bookings/booking-list"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { buildSnapshotV1, coerceOwnerStatementManualLine, computeExpenses } from "@/lib/owner-statement/compute"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import {
  checkInAllowedOnOwnerStatement,
  checkInInCalendarMonth,
  previousCalendarMonth,
  receiptYmdInStatementMonth,
} from "@/lib/owner-statement/statement-eligibility"
import { isOwnerStatementSnapshotV1, type OwnerStatementManualLineV1 } from "@/lib/owner-statement/types"
import { type ReceiptCategoryValue } from "@/lib/types/receipt"

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const

const ACTIVE = new Set<BookingStatus>([
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
])

function receiptInMonth(dateStr: string, year: number, month: number): boolean {
  return receiptYmdInStatementMonth(dateStr, year, month)
}

/** Unreconciled + active, check-in in a specific calendar month. */
function bookingEligibleInMonth(b: BookingListRow, year: number, month: number): boolean {
  if (b.owner_statement_id) return false
  if (!ACTIVE.has(b.status)) return false
  const d = parseISO(b.check_in)
  if (Number.isNaN(d.getTime())) return false
  return checkInInCalendarMonth(d, year, month)
}

/** May appear on this statement: statement month or previous calendar month, unreconciled, active. */
function bookingSelectableForStatement(b: BookingListRow, statementYear: number, statementMonth: number): boolean {
  if (b.owner_statement_id) return false
  if (!ACTIVE.has(b.status)) return false
  const d = parseISO(b.check_in)
  if (Number.isNaN(d.getTime())) return false
  return checkInAllowedOnOwnerStatement(d, statementYear, statementMonth)
}

function numFromString(s: string | null | undefined): number {
  if (s == null || s === "") return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export type GenerateOwnerStatementModalProps = {
  propertyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyName: string
  propertyCommissionPercent: number | null
  bookings: BookingListRow[]
  receipts: Array<{
    id: string
    date: string
    supplier: string
    amount: string
    category: ReceiptCategoryValue
  }>
  initialEdit?: {
    statementId: string
    snapshot: unknown
  } | null
  /** When opening from the Statements tab, sync period and booking selection. */
  tabPrefill?: {
    year: number
    month: number
    bookingIds: string[]
  } | null
  onCompleted?: () => void
}

export function GenerateOwnerStatementModal({
  propertyId,
  open,
  onOpenChange,
  propertyName,
  propertyCommissionPercent,
  bookings,
  receipts,
  initialEdit,
  tabPrefill,
  onCompleted,
}: GenerateOwnerStatementModalProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - i), [currentYear])

  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(currentYear))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [commissionOverride, setCommissionOverride] = useState("")
  const [manualLines, setManualLines] = useState<OwnerStatementManualLineV1[]>([])
  const [receiptTenPercent, setReceiptTenPercent] = useState<Record<string, boolean>>({})
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set())
  const [draftStatementId, setDraftStatementId] = useState<string | null>(null)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const wasOpenRef = useRef(false)

  const y = Number(year)
  const m = Number(month)

  const applySnapshot = useCallback(
    (snap: unknown, statementId: string | null) => {
      if (!isOwnerStatementSnapshotV1(snap)) return
      setMonth(String(snap.month))
      setYear(String(snap.year))
      setSelectedIds(new Set(snap.bookingIds))
      setManualLines(
        snap.manualLines.length > 0
          ? snap.manualLines.map((row) => coerceOwnerStatementManualLine(row))
          : []
      )
      setDraftStatementId(statementId)
      const rSel: Record<string, boolean> = {}
      const rIds = new Set<string>()
      for (const line of snap.receiptLines) {
        rIds.add(line.receiptId)
        rSel[line.receiptId] = line.addTenPercent
      }
      setSelectedReceiptIds(rIds)
      setReceiptTenPercent(rSel)
      if (snap.commissionPercentOverride != null) {
        setCommissionOverride(String(snap.commissionPercentOverride))
      } else {
        setCommissionOverride("")
      }
    },
    []
  )

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    if (initialEdit?.snapshot != null) {
      applySnapshot(initialEdit.snapshot, initialEdit.statementId)
      return
    }

    if (tabPrefill != null) {
      const py = tabPrefill.year
      const pm = tabPrefill.month
      setMonth(String(pm))
      setYear(String(py))
      setCommissionOverride("")
      setManualLines([])
      setReceiptTenPercent({})
      setSelectedReceiptIds(new Set())
      setDraftStatementId(null)

      const { year: pPy, month: pPm } = previousCalendarMonth(py, pm)
      const eligibleThis = bookings.filter((b) => bookingEligibleInMonth(b, py, pm))
      const eligiblePrev = bookings.filter((b) => bookingEligibleInMonth(b, pPy, pPm))
      const allowed = new Set([...eligibleThis, ...eligiblePrev].map((b) => b.id))
      const fromTab = tabPrefill.bookingIds.filter((id) => allowed.has(id))
      setSelectedIds(
        new Set(fromTab.length > 0 ? fromTab : eligibleThis.map((b) => b.id))
      )
      return
    }

    const now = new Date()
    const m0 = now.getMonth() + 1
    const y0 = now.getFullYear()
    setMonth(String(m0))
    setYear(String(y0))
    setCommissionOverride("")
    setManualLines([])
    setReceiptTenPercent({})
    setSelectedReceiptIds(new Set())
    setDraftStatementId(null)

    const eligible = bookings.filter((b) => bookingEligibleInMonth(b, y0, m0))
    setSelectedIds(new Set(eligible.map((b) => b.id)))
  }, [open, initialEdit, tabPrefill, applySnapshot, bookings])

  const syncSelectionToMonth = useCallback(
    (nextY: number, nextM: number) => {
      const eligible = bookings.filter((b) => bookingEligibleInMonth(b, nextY, nextM))
      setSelectedIds(new Set(eligible.map((b) => b.id)))
    },
    [bookings]
  )

  const eligibleBookingsThisMonth = useMemo(() => {
    if (!Number.isFinite(y) || !Number.isFinite(m)) return []
    return bookings.filter((b) => bookingEligibleInMonth(b, y, m))
  }, [bookings, y, m])

  const prevPeriod = useMemo(() => {
    if (!Number.isFinite(y) || !Number.isFinite(m)) return null
    return previousCalendarMonth(y, m)
  }, [y, m])

  const eligibleBookingsPrevMonth = useMemo(() => {
    if (!prevPeriod) return []
    return bookings.filter((b) => bookingEligibleInMonth(b, prevPeriod.year, prevPeriod.month))
  }, [bookings, prevPeriod])

  const selectedBookingsForStatement = useMemo(() => {
    if (!Number.isFinite(y) || !Number.isFinite(m)) return []
    return bookings.filter((b) => selectedIds.has(b.id) && bookingSelectableForStatement(b, y, m))
  }, [bookings, selectedIds, y, m])

  const receiptsForMonth = useMemo(() => {
    if (!Number.isFinite(y) || !Number.isFinite(m)) return []
    return receipts.filter((r) => receiptInMonth(r.date, y, m))
  }, [receipts, y, m])

  const overrideNum = commissionOverride.trim() === "" ? null : Number(commissionOverride)
  const overrideValid =
    commissionOverride.trim() === "" || (Number.isFinite(overrideNum) && overrideNum! >= 0 && overrideNum! <= 100)

  const snapshotPreview = useMemo(() => {
    const bookingSnapshots = selectedBookingsForStatement.map((b) => {
      const checkIn = new Date(b.check_in)
      const checkOut = new Date(b.check_out)
      const numNights = Math.max(
        0,
        Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      )
      const commission = numFromString(b.commission)
      const commissionTax = numFromString(b.commission_tax)
      return {
        id: b.id,
        guest_name: b.guest_name,
        check_in: b.check_in,
        check_out: b.check_out,
        num_nights: numNights,
        channel_label: formatChannelLabel(b.channel_name, b.source),
        accommodation_total: numFromString(b.accommodation_total),
        discount: numFromString(b.discount),
        extra_guest_charge: numFromString(b.extra_guest_charge),
        cleaning_fee: numFromString(b.cleaning_fee),
        extra_charges: numFromString(b.extra_charges),
        upsells: numFromString(b.upsells),
        booking_taxes: numFromString(b.booking_taxes),
        channel_commission: commission + commissionTax,
        total_management_fee: numFromString(b.total_management_fee),
        payment_processing_fee: numFromString(b.payment_processing_fee),
        total_payout: numFromString(b.total_payout),
      }
    })

    const receiptSelections = Array.from(selectedReceiptIds).map((id) => ({
      receiptId: id,
      addTenPercent: receiptTenPercent[id] ?? false,
    }))

    const receiptLines = receiptSelections.map((sel) => {
      const row = receipts.find((r) => r.id === sel.receiptId)!
      return {
        receiptId: row.id,
        supplier: row.supplier,
        amount: numFromString(row.amount),
        addTenPercent: sel.addTenPercent,
      }
    })

    return buildSnapshotV1({
      month: m,
      year: y,
      commissionPercentProperty: propertyCommissionPercent,
      commissionPercentOverride: overrideValid && overrideNum != null ? overrideNum : null,
      bookings: bookingSnapshots,
      manualLines,
      receiptLines,
    })
  }, [
    selectedBookingsForStatement,
    m,
    y,
    propertyCommissionPercent,
    overrideNum,
    overrideValid,
    manualLines,
    selectedReceiptIds,
    receiptTenPercent,
    receipts,
  ])

  const toggleBooking = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllEligible = () => {
    setSelectedIds(new Set(eligibleBookingsThisMonth.map((b) => b.id)))
  }

  const selectAllPrevEligible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const b of eligibleBookingsPrevMonth) next.add(b.id)
      return next
    })
  }

  const clearPrevEligible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const b of eligibleBookingsPrevMonth) next.delete(b.id)
      return next
    })
  }

  const clearThisMonthBookings = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const b of eligibleBookingsThisMonth) next.delete(b.id)
      return next
    })
  }

  const addManualLine = () => {
    setManualLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, addTenPercent: false },
    ])
  }

  const updateManualLine = (id: string, patch: Partial<OwnerStatementManualLineV1>) => {
    setManualLines((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const removeManualLine = (id: string) => {
    setManualLines((prev) => prev.filter((row) => row.id !== id))
  }

  const toggleReceiptSelected = (id: string) => {
    setSelectedReceiptIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const buildPayload = () => ({
    statementId: draftStatementId ?? undefined,
    propertyId,
    month: m,
    year: y,
    bookingIds: bookings
      .filter((b) => selectedIds.has(b.id) && bookingSelectableForStatement(b, y, m))
      .map((b) => b.id),
    commissionPercentOverride:
      commissionOverride.trim() === ""
        ? null
        : Number.isFinite(Number(commissionOverride))
          ? Number(commissionOverride)
          : null,
    manualLines,
    receiptSelections: Array.from(selectedReceiptIds).map((id) => ({
      receiptId: id,
      addTenPercent: receiptTenPercent[id] ?? false,
    })),
  })

  const onSaveDraft = () => {
    if (!overrideValid) {
      toast.error("Commission override must be between 0 and 100.")
      return
    }
    setIsSaving(true)
    const timeout = 30_000
    const savePromise = saveOwnerStatementDraft(buildPayload())
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeout)
    )
    Promise.race([savePromise, timeoutPromise])
      .then((result) => {
        setDraftStatementId(result.statementId)
        toast.success("Draft saved")
        router.refresh()
        onCompleted?.()
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : "Failed to save draft"
        toast.error(message)
        if (process.env.NODE_ENV === "development") {
          console.error("[Save draft]", e)
        }
      })
      .finally(() => setIsSaving(false))
  }

  const onFinalize = () => {
    if (!overrideValid) {
      toast.error("Commission override must be between 0 and 100.")
      return
    }
    if (selectedBookingsForStatement.length === 0) {
      toast.error("Select at least one booking.")
      return
    }
    setFinalizeOpen(true)
  }

  const confirmFinalize = () => {
    setFinalizeOpen(false)
    setIsSaving(true)
    const timeout = 60_000
    const finalizePromise = finalizeOwnerStatement(buildPayload())
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeout)
    )
    Promise.race([finalizePromise, timeoutPromise])
      .then(() => {
        toast.success("Statement finalized")
        onOpenChange(false)
        router.refresh()
        onCompleted?.()
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : "Failed to finalize"
        toast.error(message)
        if (process.env.NODE_ENV === "development") {
          console.error("[Finalize]", e)
        }
      })
      .finally(() => setIsSaving(false))
  }

  const onDeleteDraft = () => {
    if (!draftStatementId) return
    setIsSaving(true)
    deleteOwnerStatementDraft(draftStatementId, propertyId)
      .then(() => {
        toast.success("Draft deleted")
        setDraftStatementId(null)
        onOpenChange(false)
        router.refresh()
        onCompleted?.()
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : "Failed to delete draft"
        toast.error(message)
        if (process.env.NODE_ENV === "development") {
          console.error("[Delete draft]", e)
        }
      })
      .finally(() => setIsSaving(false))
  }

  const missingPayoutWarning = useMemo(() => {
    return selectedBookingsForStatement.some((b) => b.total_payout == null || b.total_payout === "")
  }, [selectedBookingsForStatement])

  /** Selected stays only — cleaning is summed into totals; this drives the expense breakdown UI. */
  const selectedCleaningRows = useMemo(() => {
    return selectedBookingsForStatement.map((b) => ({
        id: b.id,
        guest_name: b.guest_name,
        check_in: b.check_in,
        cleaning_fee: numFromString(b.cleaning_fee),
      }))
  }, [selectedBookingsForStatement])

  const cleaningFrequencySummary = useMemo(() => {
    const n = selectedCleaningRows.length
    const nonZero = selectedCleaningRows.filter((r) => r.cleaning_fee > 0).length
    const zero = n - nonZero
    const total = selectedCleaningRows.reduce((s, r) => s + r.cleaning_fee, 0)
    return { n, nonZero, zero, total }
  }, [selectedCleaningRows])

  const previewExpenseLines = useMemo(
    () => computeExpenses(snapshotPreview.manualLines, snapshotPreview.receiptLines).lines,
    [snapshotPreview.manualLines, snapshotPreview.receiptLines]
  )

  const formatQty = (q: number | null) =>
    q == null ? "—" : new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 4 }).format(q)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(92vh,960px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1400px,calc(100vw-2rem))]">
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <DialogTitle>Generate owner statement</DialogTitle>
            <DialogDescription>
              {propertyName} — the main list is stays with check-in in the statement month. You can add unreconciled
              stays from the previous calendar month (e.g. a 31 Jan check-in on a February statement). Finalizing
              links bookings to this statement so they won&apos;t appear on a later draft.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Statement month</Label>
                  <Select
                    value={month}
                    onValueChange={(v) => {
                      setMonth(v)
                      const nm = Number(v)
                      if (Number.isFinite(nm) && Number.isFinite(y)) syncSelectionToMonth(y, nm)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((item) => (
                        <SelectItem key={item.value} value={String(item.value)}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={year}
                    onValueChange={(v) => {
                      setYear(v)
                      const ny = Number(v)
                      if (Number.isFinite(ny) && Number.isFinite(m)) syncSelectionToMonth(ny, m)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((item) => (
                        <SelectItem key={item} value={String(item)}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Right Stay commission (%)</Label>
                <p className="text-xs text-muted-foreground">
                  Property default:{" "}
                  {propertyCommissionPercent != null ? `${propertyCommissionPercent}%` : "not set (treated as 0)"}.
                  Override for this statement only:
                </p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="Use property default"
                  value={commissionOverride}
                  onChange={(e) => setCommissionOverride(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Bookings (check-in in this month)</h3>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllEligible}>
                      Select all
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={clearThisMonthBookings}>
                      Clear month
                    </Button>
                  </div>
                </div>
                {missingPayoutWarning ? (
                  <p className="mb-2 text-xs text-amber-700">
                    Some selected bookings have no payout amount in the CSV — they count as R 0.00 in totals.
                  </p>
                ) : null}
                {eligibleBookingsThisMonth.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No unreconciled bookings for this month.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[720px] text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10" />
                          <TableHead className="min-w-[140px]">Guest</TableHead>
                          <TableHead className="whitespace-nowrap">Check-in</TableHead>
                          <TableHead className="min-w-[100px]">Channel</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Payout</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Cleaning</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eligibleBookingsThisMonth.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="size-4 rounded border-slate-300"
                                checked={selectedIds.has(b.id)}
                                onChange={() => toggleBooking(b.id)}
                              />
                            </TableCell>
                            <TableCell className="max-w-[200px] font-medium break-words">
                              {b.guest_name}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {format(parseISO(b.check_in), "d MMM yyyy")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatChannelLabel(b.channel_name, b.source)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums">
                              {formatMoneyZar(numFromString(b.total_payout))}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums">
                              {formatMoneyZar(numFromString(b.cleaning_fee))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {prevPeriod ? (
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Also include — check-in in {format(new Date(prevPeriod.year, prevPeriod.month - 1, 1), "MMMM yyyy")}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Stays that checked in late in the prior month are often paid on this statement. Only
                        unreconciled bookings from that month appear here.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAllPrevEligible}>
                        Select all
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={clearPrevEligible}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  {eligibleBookingsPrevMonth.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No unreconciled bookings with check-in in{" "}
                      {format(new Date(prevPeriod.year, prevPeriod.month - 1, 1), "MMMM yyyy")}.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border border-dashed border-slate-300 bg-slate-50/50">
                      <Table className="min-w-[720px] text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10" />
                            <TableHead className="min-w-[140px]">Guest</TableHead>
                            <TableHead className="whitespace-nowrap">Check-in</TableHead>
                            <TableHead className="min-w-[100px]">Channel</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Payout</TableHead>
                            <TableHead className="whitespace-nowrap text-right">Cleaning</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eligibleBookingsPrevMonth.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  className="size-4 rounded border-slate-300"
                                  checked={selectedIds.has(b.id)}
                                  onChange={() => toggleBooking(b.id)}
                                />
                              </TableCell>
                              <TableCell className="max-w-[200px] font-medium break-words">
                                {b.guest_name}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {format(parseISO(b.check_in), "d MMM yyyy")}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {formatChannelLabel(b.channel_name, b.source)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {formatMoneyZar(numFromString(b.total_payout))}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {formatMoneyZar(numFromString(b.cleaning_fee))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Cleaning fees (automatic from CSV)</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Each selected stay uses the <strong>cleaning fee</strong> from your Uplisting CSV import. These
                  amounts are summed and deducted once in the preview (same as one expense line per stay, charged
                  per booking).
                </p>
                {selectedCleaningRows.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Select at least one booking to see cleaning lines.</p>
                ) : (
                  <>
                    <p className="mt-2 text-xs font-medium text-slate-700">
                      Frequency:{" "}
                      <span className="font-normal text-muted-foreground">
                        {cleaningFrequencySummary.nonZero} of {cleaningFrequencySummary.n} selected stay
                        {cleaningFrequencySummary.n === 1 ? "" : "s"} with a non-zero cleaning fee;{" "}
                        {cleaningFrequencySummary.zero} stay
                        {cleaningFrequencySummary.zero === 1 ? "" : "s"} at R&nbsp;0,00 or blank in CSV.
                      </span>
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white">
                      <Table className="min-w-[480px] text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Guest</TableHead>
                            <TableHead className="whitespace-nowrap">Check-in</TableHead>
                            <TableHead className="text-right">Cleaning (CSV)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCleaningRows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="max-w-[220px] font-medium break-words">{r.guest_name}</TableCell>
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {format(parseISO(r.check_in), "d MMM yyyy")}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {formatMoneyZar(r.cleaning_fee)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 border-slate-200 bg-slate-50 font-medium">
                            <TableCell colSpan={2}>Total cleaning deducted (this statement)</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoneyZar(cleaningFrequencySummary.total)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Receipts (this month)</h3>
                {receiptsForMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No receipts dated in this month.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[560px] text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10" />
                          <TableHead>Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-28 text-center">+10%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receiptsForMonth.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="size-4 rounded border-slate-300"
                                checked={selectedReceiptIds.has(r.id)}
                                onChange={() => toggleReceiptSelected(r.id)}
                              />
                            </TableCell>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>{r.supplier}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoneyZar(numFromString(r.amount))}
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="size-4 rounded border-slate-300"
                                title="Add 10% to this receipt"
                                disabled={!selectedReceiptIds.has(r.id)}
                                checked={receiptTenPercent[r.id] ?? false}
                                onChange={(e) =>
                                  setReceiptTenPercent((prev) => ({ ...prev, [r.id]: e.target.checked }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Manual expenses</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addManualLine}>
                    <Plus className="mr-1 size-4" />
                    Add line
                  </Button>
                </div>
                {manualLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">e.g. mid-stay clean, welcome pack.</p>
                ) : (
                  <div className="space-y-2">
                    {manualLines.map((line) => (
                      <div key={line.id} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                        <div className="min-w-[160px] flex-1 space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={line.description}
                            onChange={(e) => updateManualLine(line.id, { description: e.target.value })}
                            placeholder="Description"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.quantity}
                            onChange={(e) => {
                              const v = e.target.value
                              updateManualLine(line.id, {
                                quantity: v === "" ? 0 : Number(v) || 0,
                              })
                            }}
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs">Unit price (ZAR)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unitPrice === 0 ? "" : line.unitPrice}
                            onChange={(e) => {
                              const v = e.target.value
                              updateManualLine(line.id, {
                                unitPrice: v === "" ? 0 : Number(v) || 0,
                              })
                            }}
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-slate-300"
                            checked={line.addTenPercent}
                            onChange={(e) => updateManualLine(line.id, { addTenPercent: e.target.checked })}
                          />
                          +10%
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeManualLine(line.id)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="size-4 text-slate-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Preview</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Total payout</dt>
                    <dd className="font-medium tabular-nums">{formatMoneyZar(snapshotPreview.totals.totalPayout)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">
                      Commission ({snapshotPreview.commissionPercentEffective.toFixed(2)}%)
                    </dt>
                    <dd className="font-medium tabular-nums">−{formatMoneyZar(snapshotPreview.totals.rsaCommission)}</dd>
                  </div>
                  <div className="sm:col-span-2 space-y-1 rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Cleaning (CSV)</dt>
                      <dd className="font-medium tabular-nums">−{formatMoneyZar(snapshotPreview.totals.totalCleaning)}</dd>
                    </div>
                    {cleaningFrequencySummary.n > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {cleaningFrequencySummary.nonZero} non-zero fee
                        {cleaningFrequencySummary.nonZero === 1 ? "" : "s"} across{" "}
                        {cleaningFrequencySummary.n} selected stay
                        {cleaningFrequencySummary.n === 1 ? "" : "s"} (per booking from import).
                      </p>
                    ) : null}
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Other expenses</dt>
                    <dd className="font-medium tabular-nums">−{formatMoneyZar(snapshotPreview.totals.otherExpenses)}</dd>
                  </div>
                  {previewExpenseLines.length > 0 ? (
                    <div className="sm:col-span-2 mt-2 overflow-x-auto rounded-md border border-slate-200 bg-white">
                      <Table className="min-w-[520px] text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit price</TableHead>
                            <TableHead className="text-right">Base</TableHead>
                            <TableHead className="text-center">+10%</TableHead>
                            <TableHead className="text-right">Charged</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewExpenseLines.map((row) => (
                            <TableRow key={row.key}>
                              <TableCell className="max-w-[220px] font-medium break-words">{row.label}</TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {formatQty(row.quantity)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {row.unitPrice != null ? formatMoneyZar(row.unitPrice) : "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {formatMoneyZar(row.baseAmount)}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                {row.addTenPercent ? "Yes" : "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums font-medium">
                                {formatMoneyZar(row.chargedAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                  <div className="sm:col-span-2 flex justify-between gap-2 border-t border-slate-200 pt-2 text-base font-semibold">
                    <dt>Net to owner</dt>
                    <dd className="tabular-nums">{formatMoneyZar(snapshotPreview.totals.netToOwner)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 border-t border-slate-200 px-6 py-4">
            {draftStatementId ? (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                disabled={isSaving}
                onClick={onDeleteDraft}
              >
                Delete draft
              </Button>
            ) : (
              <span className="mr-auto" />
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" variant="secondary" disabled={isSaving} onClick={onSaveDraft}>
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
            <Button type="button" disabled={isSaving} onClick={onFinalize}>
              Finalize & PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this statement?</AlertDialogTitle>
            <AlertDialogDescription>
              A PDF will be generated and saved. Selected bookings will be marked as paid on this statement and
              excluded from future drafts. You cannot add the same finalized month again unless the statement is
              deleted (super-admin).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalize}>Finalize</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
