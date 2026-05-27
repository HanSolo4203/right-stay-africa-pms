"use client"

import { parseISO } from "date-fns"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import {
  ClientsStatementsOverview,
  flattenClientsToOverviewRows,
  type StatementOverviewRow,
} from "@/components/clients/clients-statements-overview"
import { ClientsStatementsPortfolioSummary } from "@/components/clients/clients-statements-portfolio-summary"
import { CreateBookingModal } from "@/components/bookings/create-booking-modal"
import { StatementBookingSubsection } from "@/components/financials/statement-booking-subsection"
import { StatementBookingOverrideDialog } from "@/components/clients/statement-booking-override-dialog"
import {
  StatementFullPaymentBadge,
  StatementManualOverrideBadge,
  StatementProrationBadge,
} from "@/components/clients/statement-proration-badge"
import { ClientsMonthToolbar, ClientsMonthToolbarButton } from "@/components/clients/clients-month-toolbar"
import { StatementAdditionalExpenses } from "@/components/clients/statement-additional-expenses"
import { StatementPayoutSummary } from "@/components/clients/statement-payout-summary"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import {
  buildBaseAutomaticExpenseItems,
  reconcileAutomaticExpenses,
} from "@/lib/clients/automatic-statement-expenses"
import {
  applyPayoutFilter,
  canIncludeBookingOnStatement,
  clientBookingRowToInput,
  formatStatementMonthYear,
  isStatementActiveBooking,
  type PayoutFilter,
} from "@/lib/clients/statement-booking-ui"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import {
  bookingHasNightsInCalendarMonth,
  nextCalendarMonth,
} from "@/lib/owner-statement/statement-eligibility"
import {
  isStatementPeriodTab,
  periodTabToMonthYear,
  type StatementPeriodTab,
} from "@/lib/clients/statement-period-tabs"
import {
  applyPreviewTotalsToStatement,
  buildOwnerStatementPreview,
} from "@/lib/owner-statement/statement-preview"
import { buildPropertyStatement } from "@/lib/statement-calculator"
import type {
  ClientStatementBookingRow,
  ClientStatementSummary,
  PropertyStatement,
} from "@/types/statement"

function bookingHasNightsInMonth(booking: ClientStatementBookingRow, year: number, month: number): boolean {
  const checkIn = parseISO(booking.check_in)
  const checkOut = parseISO(booking.check_out)
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) return false
  return bookingHasNightsInCalendarMonth(checkIn, checkOut, year, month)
}

const PdfViewer = dynamic(
  () => import("@/components/shared/pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false, loading: () => null }
)

const STATEMENTS_BUCKET = "documents"

async function fetchStatementSignedUrl(path: string): Promise<string> {
  const response = await fetch(
    `/api/storage/signed-url?bucket=${encodeURIComponent(STATEMENTS_BUCKET)}&path=${encodeURIComponent(path)}`
  )
  const payload = (await response.json()) as { signedUrl?: string; error?: string }
  if (!response.ok || !payload.signedUrl) {
    throw new Error(payload.error ?? "Failed to open statement.")
  }
  return payload.signedUrl
}

function formatPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

type StatementsResponse = {
  clients: ClientStatementSummary[]
  month: number
  year: number
}

function statementsCacheKey(month: number, year: number, clientId?: string | null) {
  return clientId ? `${clientId}:${year}-${month}` : `all:${year}-${month}`
}

function mergePropertyStatement(
  data: StatementsResponse,
  clientId: string,
  updated: PropertyStatement
): StatementsResponse {
  return {
    ...data,
    clients: data.clients.map((c) =>
      c.clientId !== clientId
        ? c
        : {
            ...c,
            properties: c.properties.map((p) =>
              p.propertyId === updated.propertyId ? updated : p
            ),
          }
    ),
  }
}

function formatMgmtFeeLabel(line: PropertyStatement["lines"][0], statement: PropertyStatement) {
  const pct = line.managementFeePercent ?? statement.managementFeePercent
  if (statement.managementFeeType === "percentage" && pct != null) {
    return `${formatMoneyZar(line.managementFeeAmount)} (${pct}%)`
  }
  return formatMoneyZar(line.managementFeeAmount)
}

function PropertyStatementPanel({
  clientId,
  statement,
  month,
  year,
  onStatementUpdated,
}: {
  clientId: string
  statement: PropertyStatement
  month: number
  year: number
  onStatementUpdated: (updated?: PropertyStatement) => void | Promise<void>
}) {
  const [generating, setGenerating] = useState(false)
  const [isPdfDownloading, setIsPdfDownloading] = useState(false)
  const [isPdfPreviewing, setIsPdfPreviewing] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [fileViewerOpen, setFileViewerOpen] = useState(false)
  const [fileViewerUrl, setFileViewerUrl] = useState("")
  const [fileViewerName, setFileViewerName] = useState("")
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(statement.lines.map((l) => l.bookingId)))
  const [manualExpenses, setManualExpenses] = useState(statement.manualExpenses)
  const [automaticExpenses, setAutomaticExpenses] = useState(statement.automaticExpenses)
  const [excludedAutomaticIds, setExcludedAutomaticIds] = useState<Set<string>>(() => new Set())
  const [existingStatementId, setExistingStatementId] = useState<string | null>(
    statement.existingStatementId
  )
  const [existingStatementStatus, setExistingStatementStatus] = useState<
    PropertyStatement["existingStatementStatus"]
  >(statement.existingStatementStatus)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [overrideBooking, setOverrideBooking] = useState<ClientStatementBookingRow | null>(null)
  const [createBookingOpen, setCreateBookingOpen] = useState(false)
  const [pendingBookings, setPendingBookings] = useState<ClientStatementBookingRow[]>([])

  const bookingOverrides = statement.bookingOverrides ?? []

  useEffect(() => {
    setPendingBookings((prev) =>
      prev.filter((b) => !statement.bookings.some((row) => row.id === b.id))
    )
  }, [statement.bookings])

  const allBookings = useMemo(() => {
    const byId = new Map(statement.bookings.map((b) => [b.id, b]))
    for (const b of pendingBookings) {
      byId.set(b.id, b)
    }
    return [...byId.values()]
  }, [statement.bookings, pendingBookings])
  const periodLabel = formatPeriod(month, year)
  const nextPeriod = useMemo(() => nextCalendarMonth(year, month), [year, month])

  useEffect(() => {
    setManualExpenses(statement.manualExpenses)
    setAutomaticExpenses(statement.automaticExpenses)
    setExcludedAutomaticIds(new Set())
    setExistingStatementId(statement.existingStatementId)
    setExistingStatementStatus(statement.existingStatementStatus)
    const fromStatement =
      statement.lines.length > 0
        ? statement.lines.map((l) => l.bookingId)
        : statement.bookings
            .filter((b) => b.owner_statement_id === statement.existingStatementId)
            .map((b) => b.id)
    setSelectedIds(new Set(fromStatement))
    setPayoutFilter("all")
  }, [
    month,
    year,
    statement.propertyId,
    statement.existingStatementId,
    statement.bookings,
    statement.bookingOverrides,
    statement.manualExpenses,
    statement.automaticExpenses,
  ])

  const activeBookings = useMemo(
    () => allBookings.filter((b) => isStatementActiveBooking(b.status)),
    [allBookings]
  )

  const baseAutomaticExpenses = useMemo(() => {
    const selected = activeBookings.filter((b) => selectedIds.has(b.id))
    return buildBaseAutomaticExpenseItems(
      selected.map((b) => ({
        id: b.id,
        guestName: b.guest_name,
        cleaningFee: Number(b.cleaning_fee ?? 0),
      })),
      statement.welcomePackFeePerBooking
    )
  }, [activeBookings, selectedIds, statement.welcomePackFeePerBooking])

  useEffect(() => {
    setAutomaticExpenses((prev) => {
      const merged = reconcileAutomaticExpenses(baseAutomaticExpenses, prev)
      return merged.filter((e) => !excludedAutomaticIds.has(e.id))
    })
  }, [baseAutomaticExpenses, excludedAutomaticIds])

  const bookingsWithNightsThisMonth = useMemo(() => {
    return activeBookings
      .filter((b) => bookingHasNightsInMonth(b, year, month))
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [activeBookings, year, month])

  const bookingsWithNightsNextMonth = useMemo(() => {
    if (!nextPeriod) return []
    return activeBookings
      .filter((b) => bookingHasNightsInMonth(b, nextPeriod.year, nextPeriod.month))
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [activeBookings, nextPeriod])

  const displayBookings = useMemo(
    () => applyPayoutFilter(bookingsWithNightsThisMonth, payoutFilter, existingStatementId),
    [bookingsWithNightsThisMonth, payoutFilter, existingStatementId]
  )
  const displayBookingsNext = useMemo(
    () => applyPayoutFilter(bookingsWithNightsNextMonth, payoutFilter, existingStatementId),
    [bookingsWithNightsNextMonth, payoutFilter, existingStatementId]
  )

  const selectedStatement = useMemo(() => {
    const selected = activeBookings.filter((b) => selectedIds.has(b.id))
    const bookingInputs = selected.map(clientBookingRowToInput)
    const base = buildPropertyStatement({
      propertyId: statement.propertyId,
      propertyName: statement.propertyName,
      month,
      year,
      commissionPercentProperty: statement.managementFeePercent,
      managementFeeType: statement.managementFeeType,
      welcomePackFeePerBooking: statement.welcomePackFeePerBooking,
      bookings: bookingInputs,
      manualExpenses,
      existingStatementId,
      existingStatementStatus,
      hasPdf: statement.hasPdf,
      isVirtualClient: statement.isVirtualClient,
      bookingOverrides,
    })
    const preview = buildOwnerStatementPreview({
      month,
      year,
      commissionPercentProperty: statement.managementFeePercent,
      welcomePackFeePerBooking: statement.welcomePackFeePerBooking,
      bookings: bookingInputs,
      manualExpenses,
      automaticExpenses,
      bookingOverrides,
    })
    return applyPreviewTotalsToStatement(base, preview)
  }, [
    activeBookings,
    selectedIds,
    statement,
    month,
    year,
    manualExpenses,
    automaticExpenses,
    existingStatementId,
    existingStatementStatus,
    bookingOverrides,
  ])

  const toggleBooking = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openOverrideForBooking = (bookingId: string) => {
    const row = activeBookings.find((b) => b.id === bookingId)
    if (!row) return
    setOverrideBooking(row)
    setOverrideDialogOpen(true)
  }

  const isIncludeSelectable = useCallback(
    (b: ClientStatementBookingRow) =>
      canIncludeBookingOnStatement(b.owner_statement_id, existingStatementId, "statement-eligible"),
    [existingStatementId]
  )

  const selectAllUnpaid = () => {
    const eligibleThis = bookingsWithNightsThisMonth.filter(isIncludeSelectable)
    setSelectedIds(new Set(eligibleThis.map((b) => b.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const automaticExpensePayload = () =>
    automaticExpenses.map(({ id, description, qty, unitPrice }) => ({
      id,
      description,
      qty,
      unitPrice,
    }))

  const statementPayload = () => ({
    clientId,
    propertyId: statement.propertyId,
    month,
    year,
    bookingIds: Array.from(selectedIds),
    statementId: existingStatementId,
    automaticExpenseLines: automaticExpensePayload(),
  })

  const saveDraft = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one booking to include.")
      return
    }
    if (statement.isVirtualClient) {
      toast.error("Assign a client to this property before saving a draft.")
      return
    }
    setSavingDraft(true)
    try {
      const res = await fetch("/api/clients/statements/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statementPayload()),
      })
      const data = (await res.json()) as {
        statementId?: string
        statement?: PropertyStatement
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save draft.")
        return
      }
      if (data.statementId) {
        setExistingStatementId(data.statementId)
        setExistingStatementStatus("DRAFT")
      }
      toast.success(
        existingStatementStatus === "FINAL" ? "Reverted to draft — finalize again when ready." : "Draft saved."
      )
      setExistingStatementStatus("DRAFT")
      onStatementUpdated(data.statement)
    } catch {
      toast.error("Failed to save draft.")
    } finally {
      setSavingDraft(false)
    }
  }

  const confirmFinalize = async () => {
    setFinalizeOpen(false)
    if (selectedIds.size === 0) {
      toast.error("Select at least one booking to include.")
      return
    }
    setFinalizing(true)
    try {
      const res = await fetch("/api/clients/statements/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statementPayload()),
      })
      const data = (await res.json()) as {
        statementId?: string
        statement?: PropertyStatement
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to finalize statement.")
        return
      }
      if (data.statementId) {
        setExistingStatementId(data.statementId)
      }
      setExistingStatementStatus("FINAL")
      toast.success("Statement saved as final.")
      onStatementUpdated(data.statement)
    } catch {
      toast.error("Failed to finalize statement.")
    } finally {
      setFinalizing(false)
    }
  }

  const updateFinalStatement = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one booking to include.")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch("/api/clients/statements/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statementPayload()),
      })
      const data = (await res.json()) as {
        statementId?: string
        statement?: PropertyStatement
        error?: string
      }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update statement.")
        return
      }
      if (data.statementId) {
        setExistingStatementId(data.statementId)
      }
      setExistingStatementStatus("FINAL")
      toast.success("Statement updated.")
      onStatementUpdated(data.statement)
    } catch {
      toast.error("Failed to update statement.")
    } finally {
      setGenerating(false)
    }
  }

  const downloadPdf = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one booking to include.")
      return
    }
    setIsPdfDownloading(true)
    try {
      const res = await fetch("/api/clients/statements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statementPayload()),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Failed to generate PDF.")
        return
      }
      const statementId = res.headers.get("X-Statement-Id")
      if (statementId) {
        setExistingStatementId(statementId)
        setExistingStatementStatus("FINAL")
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? "Owner-Statement.pdf"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Statement finalized and downloaded.")
      onStatementUpdated()
    } catch {
      toast.error("Failed to generate PDF.")
    } finally {
      setIsPdfDownloading(false)
    }
  }

  const viewOnFilePdf = async () => {
    if (!statement.existingStatementFileUrl) return
    setGenerating(true)
    try {
      const signedUrl = await fetchStatementSignedUrl(statement.existingStatementFileUrl)
      setFileViewerUrl(signedUrl)
      setFileViewerName(statement.existingStatementFileName ?? "Owner-Statement.pdf")
      setFileViewerOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open statement.")
    } finally {
      setGenerating(false)
    }
  }

  const previewPdf = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one booking to include.")
      return
    }
    setIsPdfPreviewing(true)
    try {
      const res = await fetch("/api/clients/statements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statementPayload()),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Failed to generate preview.")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch {
      toast.error("Failed to generate preview.")
    } finally {
      setIsPdfPreviewing(false)
    }
  }

  if (activeBookings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
        No active bookings for {statement.propertyName}.
      </p>
    )
  }

  const preview = selectedStatement
  const hasProratedLines = preview.lines.some((line) => line.isProrated)

  return (
    <div className="space-y-8">
      <StatementPayoutSummary
        statement={preview}
        periodLabel={periodLabel}
        selectedBookingCount={preview.lines.length}
      />
      {preview.totals.totalNights > 0 ? (
        <p className="text-xs text-slate-500">
          Occupancy in {formatStatementMonthYear(month, year)}:{" "}
          <span className="font-medium text-slate-900">
            {(
              (preview.totals.totalNights / new Date(year, month, 0).getDate()) *
              100
            ).toFixed(1)}
            %
          </span>{" "}
          · {preview.totals.totalNights} of {new Date(year, month, 0).getDate()} nights in this month.
        </p>
      ) : null}

      {existingStatementStatus === "FINAL" && statement.hasPdf ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
          A finalized statement is on file for this period. Change bookings or expenses below, then use{" "}
          <strong>Update</strong> to replace it.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={
            savingDraft ||
            generating ||
            isPdfDownloading ||
            isPdfPreviewing ||
            finalizing ||
            selectedIds.size === 0 ||
            statement.isVirtualClient
          }
          onClick={() => void saveDraft()}
        >
          {savingDraft ? <Loader2 className="size-4 animate-spin" /> : null}
          {existingStatementStatus === "FINAL" ? "Revert to draft" : "Save as draft"}
        </Button>
        {existingStatementStatus !== "FINAL" ? (
          <Button
            type="button"
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={
              generating ||
              isPdfDownloading ||
              isPdfPreviewing ||
              savingDraft ||
              finalizing ||
              selectedIds.size === 0
            }
            onClick={() => setFinalizeOpen(true)}
          >
            {finalizing ? <Loader2 className="size-4 animate-spin" /> : null}
            Save as final
          </Button>
        ) : null}
        <Button
          type="button"
          className="bg-emerald-700 hover:bg-emerald-800"
          disabled={
            generating ||
            isPdfDownloading ||
            isPdfPreviewing ||
            savingDraft ||
            finalizing ||
            selectedIds.size === 0
          }
          onClick={() =>
            void (existingStatementStatus === "FINAL" ? updateFinalStatement() : downloadPdf())
          }
        >
          {existingStatementStatus === "FINAL" && generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isPdfDownloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {existingStatementStatus === "FINAL"
            ? generating
              ? "Updating…"
              : "Update"
            : isPdfDownloading
              ? "Generating…"
              : "Download PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={
            generating ||
            isPdfDownloading ||
            isPdfPreviewing ||
            savingDraft ||
            finalizing ||
            selectedIds.size === 0
          }
          onClick={previewPdf}
        >
          {isPdfPreviewing ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPdfPreviewing ? "Generating…" : "Preview PDF"}
        </Button>
        {existingStatementStatus === "FINAL" && statement.existingStatementFileUrl ? (
          <Button
            type="button"
            variant="outline"
            disabled={generating || isPdfDownloading || isPdfPreviewing || savingDraft || finalizing}
            onClick={() => void viewOnFilePdf()}
          >
            View on file
          </Button>
        ) : null}
        {existingStatementStatus === "DRAFT" ? (
          <Badge variant="outline" className="border-amber-300 text-amber-900">
            Draft saved
          </Badge>
        ) : null}
        {existingStatementStatus === "FINAL" && statement.hasPdf ? (
          <Badge variant="outline" className="border-teal-300 text-teal-800">
            Statement on file
          </Badge>
        ) : null}
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Step 2 — Select bookings
            </p>
            <h3 className="mt-1 text-sm font-semibold text-slate-900">Bookings (CSV)</h3>
            <p className="text-xs text-muted-foreground">
              Same rules as property Financials: tick <strong>Include</strong> for this period, then generate a PDF.
              Paid bookings are already on a finalized statement. For stays spanning months, choose{" "}
              <strong>Pro-rated</strong> or <strong>Full payment</strong> per booking, or use{" "}
              <strong>Custom amounts</strong> when figures differ from CSV.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Payout status</span>
              <Select value={payoutFilter} onValueChange={(v) => setPayoutFilter(v as PayoutFilter)}>
                <SelectTrigger className="w-[180px] bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All active bookings</SelectItem>
                  <SelectItem value="unpaid">Not on a statement yet</SelectItem>
                  <SelectItem value="paid">Paid (on a statement)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={selectAllUnpaid}>
              Select all unpaid
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </div>

        <StatementBookingSubsection
          title={`Stays with nights in ${formatStatementMonthYear(month, year)}`}
          description="Bookings with occupied nights in the selected statement month. Long stays default to pro-rated by nights; use the allocation control to apply full CSV payment instead."
          rows={displayBookings}
          canSelect
          selectedIds={selectedIds}
          onToggle={toggleBooking}
          includeMode="statement-eligible"
          currentStatementId={existingStatementId}
          statementYear={year}
          statementMonth={month}
          bookingOverrides={bookingOverrides}
          canEditOverrides={!statement.isVirtualClient}
          clientId={clientId}
          propertyId={statement.propertyId}
          onAllocationModeChanged={onStatementUpdated}
          headerActions={
            !statement.isVirtualClient ? (
              <Button
                type="button"
                size="sm"
                className="bg-green-700 text-white hover:bg-green-800"
                onClick={() => setCreateBookingOpen(true)}
              >
                <Plus className="mr-1 size-4" />
                Add booking
              </Button>
            ) : undefined
          }
          onEditOverride={(b) => {
            setOverrideBooking(b)
            setOverrideDialogOpen(true)
          }}
          emptyMessage="No active bookings with occupied nights in this month (for the current payout filter)."
        />

        <StatementBookingSubsection
          title={`Next month — nights in ${formatStatementMonthYear(nextPeriod.month, nextPeriod.year)}`}
          description="Upcoming stays for planning. Change the month/year above to generate a statement for that period."
          rows={displayBookingsNext}
          canSelect
          selectedIds={selectedIds}
          onToggle={toggleBooking}
          includeMode="next-month"
          currentStatementId={existingStatementId}
          greyed
          emptyMessage="No active bookings with occupied nights in the next calendar month (for the current payout filter)."
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Step 3 — Booking breakdown
        </p>
        <h3 className="mt-1 mb-4 text-sm font-semibold text-slate-900">
          Line items for selected bookings
        </h3>
      {preview.lines.length > 0 ? (
        <>
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                <TableHead>Guest</TableHead>
                <TableHead>Check in</TableHead>
                <TableHead>Check out</TableHead>
                <TableHead className="text-right">Nights</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Booking fees</TableHead>
                <TableHead className="text-right">Mgmt fee</TableHead>
                <TableHead className="text-right">Bookings payout</TableHead>
                <TableHead className="w-[72px]">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.lines.map((line) => (
                <TableRow key={line.bookingId} className="border-b border-slate-100">
                  <TableCell>
                    <span className="font-medium">{line.guestName}</span>
                    {line.isFullPayment ? (
                      <StatementFullPaymentBadge />
                    ) : line.isManualOverride && line.manualNote ? (
                      <StatementManualOverrideBadge note={line.manualNote} />
                    ) : line.isProrated && line.nightsInMonth != null && line.totalStayNights != null ? (
                      <StatementProrationBadge
                        checkIn={line.checkIn}
                        checkOut={line.checkOut}
                        nights={line.nightsInMonth}
                        totalNights={line.totalStayNights}
                        statementMonth={month}
                        statementYear={year}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>{formatShortDate(line.checkIn)}</TableCell>
                  <TableCell>{formatShortDate(line.checkOut)}</TableCell>
                  <TableCell className="text-right">{line.nights}</TableCell>
                  <TableCell>{line.platform}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoneyZar(line.grossRevenue)}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">
                    {line.discount > 0 ? formatMoneyZar(line.discount) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.bookingFees > 0 ? `−${formatMoneyZar(line.bookingFees)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatMgmtFeeLabel(line, preview)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(line.bookingPayout > 0 ? line.bookingPayout : line.netToOwner)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={statement.isVirtualClient}
                      title={
                        statement.isVirtualClient
                          ? "Assign a client to this property before editing amounts."
                          : undefined
                      }
                      onClick={() => openOverrideForBooking(line.bookingId)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50/80 font-semibold">
                <TableCell colSpan={5}>Totals</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(preview.totals.grossRevenue)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-500">
                  {preview.totals.totalDiscount > 0
                    ? formatMoneyZar(preview.totals.totalDiscount)
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {preview.totals.totalBookingFees > 0
                    ? `−${formatMoneyZar(preview.totals.totalBookingFees)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(preview.totals.totalManagementFees)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoneyZar(preview.totals.totalBookingsPayout)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
        {hasProratedLines ? (
          <p className="mt-2 text-xs italic text-muted-foreground">
            One or more bookings span multiple months. Amounts in this table are pro-rated by occupied
            nights in {periodLabel} — not the full booking value from Uplisting.
          </p>
        ) : null}
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
          No bookings selected for {periodLabel}. Tick Include in step 2 to add stays to this statement.
        </p>
      )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="mb-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Step 4 — Additional expenses
        </p>
        <StatementAdditionalExpenses
          clientId={clientId}
          propertyId={statement.propertyId}
          month={month}
          year={year}
          manualExpenses={manualExpenses}
          automaticExpenses={automaticExpenses}
          defaultAutomaticExpenses={baseAutomaticExpenses}
          welcomePackFeePerBooking={statement.welcomePackFeePerBooking}
          selectedBookingCount={preview.lines.length}
          disabled={statement.isVirtualClient}
          onManualExpenseAdded={(expense) =>
            setManualExpenses((prev) => [...prev, expense])
          }
          onManualExpenseUpdated={(expense) =>
            setManualExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)))
          }
          onManualExpenseRemoved={(id) =>
            setManualExpenses((prev) => prev.filter((e) => e.id !== id))
          }
          onAutomaticExpenseChange={(expense) => {
            setExcludedAutomaticIds((prev) => {
              const next = new Set(prev)
              next.delete(expense.id)
              return next
            })
            setAutomaticExpenses((prev) => {
              if (prev.some((e) => e.id === expense.id)) {
                return prev.map((e) => (e.id === expense.id ? expense : e))
              }
              return [...prev, expense]
            })
          }}
          onAutomaticExpenseRemove={(id) =>
            setExcludedAutomaticIds((prev) => new Set(prev).add(id))
          }
        />
      </section>

      {previewUrl ? (
        <PdfViewer
          signedUrl={previewUrl}
          fileName={`Statement-${statement.propertyName}.pdf`}
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open)
            if (!open && previewUrl) {
              URL.revokeObjectURL(previewUrl)
              setPreviewUrl("")
            }
          }}
          hideTrigger
        />
      ) : null}
      {fileViewerUrl ? (
        <PdfViewer
          signedUrl={fileViewerUrl}
          fileName={fileViewerName}
          open={fileViewerOpen}
          onOpenChange={setFileViewerOpen}
          hideTrigger
        />
      ) : null}

      <CreateBookingModal
        open={createBookingOpen}
        onOpenChange={setCreateBookingOpen}
        propertyId={statement.propertyId}
        onCreated={async (result) => {
          setPendingBookings((prev) => {
            const rest = prev.filter((b) => b.id !== result.booking.id)
            return [...rest, result.booking]
          })
          const checkIn = parseISO(result.check_in)
          const checkOut = parseISO(result.check_out)
          if (
            !Number.isNaN(checkIn.getTime()) &&
            !Number.isNaN(checkOut.getTime()) &&
            bookingHasNightsInCalendarMonth(checkIn, checkOut, year, month)
          ) {
            setSelectedIds((prev) => new Set([...prev, result.id]))
          }
          await onStatementUpdated()
        }}
      />

      <StatementBookingOverrideDialog
        open={overrideDialogOpen}
        onOpenChange={setOverrideDialogOpen}
        clientId={clientId}
        propertyId={statement.propertyId}
        month={month}
        year={year}
        booking={overrideBooking}
        existingOverride={
          overrideBooking
            ? (bookingOverrides.find((o) => o.booking_id === overrideBooking.id) ?? null)
            : null
        }
        commissionPercent={statement.managementFeePercent}
        managementFeeType={statement.managementFeeType}
        onSaved={onStatementUpdated}
      />

      <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save statement as final?</AlertDialogTitle>
            <AlertDialogDescription>
              A PDF will be generated and saved on file. Selected bookings will be marked as paid on this
              statement and excluded from future drafts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmFinalize()}>Save as final</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function ClientsStatementsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const periodParam = searchParams.get("period")
  const periodTab: StatementPeriodTab = isStatementPeriodTab(periodParam)
    ? periodParam
    : "current"

  const customMonthRaw = Number(searchParams.get("month"))
  const customYearRaw = Number(searchParams.get("year"))
  const hasCustomPeriodInUrl =
    !searchParams.get("client") &&
    Number.isInteger(customMonthRaw) &&
    customMonthRaw >= 1 &&
    customMonthRaw <= 12 &&
    Number.isInteger(customYearRaw) &&
    customYearRaw >= 2000 &&
    customYearRaw <= 2100

  const editClientId = searchParams.get("client")
  const editPropertyId = searchParams.get("property")
  const editMonthRaw = Number(searchParams.get("month"))
  const editYearRaw = Number(searchParams.get("year"))
  const hasEditPeriod =
    Number.isInteger(editMonthRaw) &&
    editMonthRaw >= 1 &&
    editMonthRaw <= 12 &&
    Number.isInteger(editYearRaw) &&
    editYearRaw >= 2000 &&
    editYearRaw <= 2100
  const isEditMode = Boolean(editClientId && hasEditPeriod)

  const { month, year } = isEditMode
    ? { month: editMonthRaw, year: editYearRaw }
    : hasCustomPeriodInUrl
      ? { month: customMonthRaw, year: customYearRaw }
      : periodTabToMonthYear(periodTab)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [data, setData] = useState<StatementsResponse | null>(null)
  const statementsCacheRef = useRef<Map<string, StatementsResponse>>(new Map())
  const fetchGenerationRef = useRef(0)
  const statementsFetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStatements = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      const scopedClientId = isEditMode && editClientId ? editClientId : null
      const cacheKey = statementsCacheKey(month, year, scopedClientId)
      const cached = statementsCacheRef.current.get(cacheKey)

      if (cached && !options?.force) {
        setData(cached)
        setLoading(false)
        setRefreshing(false)
        if (options?.silent) return
      }

      if (options?.silent || (isEditMode && cached)) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const generation = ++fetchGenerationRef.current

      try {
        const params = new URLSearchParams({
          month: String(month),
          year: String(year),
        })
        if (scopedClientId) params.set("clientId", scopedClientId)
        const res = await fetch(`/api/clients/statements?${params.toString()}`)
        const json = (await res.json()) as StatementsResponse & { error?: string }
        if (generation !== fetchGenerationRef.current) return
        if (!res.ok) {
          toast.error(json.error ?? "Failed to load statements.")
          return
        }
        statementsCacheRef.current.set(cacheKey, json)
        setData(json)
      } catch {
        toast.error("Failed to load statements.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [month, year, isEditMode, editClientId]
  )

  const handleStatementUpdated = useCallback(
    async (updated?: PropertyStatement) => {
      if (updated && data && editClientId) {
        const merged = mergePropertyStatement(data, editClientId, updated)
        setData(merged)
        const cacheKey = statementsCacheKey(month, year, editClientId)
        statementsCacheRef.current.set(cacheKey, merged)
        statementsCacheRef.current.delete(statementsCacheKey(month, year, null))
        return
      }
      if (editClientId) {
        statementsCacheRef.current.delete(statementsCacheKey(month, year, editClientId))
        statementsCacheRef.current.delete(statementsCacheKey(month, year, null))
      }
      await fetchStatements({ silent: true, force: true })
    },
    [data, editClientId, month, year, fetchStatements]
  )

  useEffect(() => {
    if (statementsFetchDebounceRef.current) {
      clearTimeout(statementsFetchDebounceRef.current)
    }
    const delay = isEditMode ? 300 : 0
    statementsFetchDebounceRef.current = setTimeout(() => {
      void fetchStatements()
    }, delay)
    return () => {
      if (statementsFetchDebounceRef.current) {
        clearTimeout(statementsFetchDebounceRef.current)
      }
    }
  }, [fetchStatements, isEditMode])

  const setPeriodTab = (tab: StatementPeriodTab) => {
    const params = new URLSearchParams()
    if (tab !== "current") params.set("period", tab)
    const q = params.toString()
    router.replace(q ? `/clients/statements?${q}` : "/clients/statements")
  }

  const setCustomPeriod = (m: number, y: number) => {
    const params = new URLSearchParams()
    params.set("month", String(m))
    params.set("year", String(y))
    router.replace(`/clients/statements?${params.toString()}`)
  }

  const setEditPeriod = (m: number, y: number) => {
    if (!editClientId) return
    const cacheKey = statementsCacheKey(m, y, editClientId)
    if (!statementsCacheRef.current.has(cacheKey)) {
      setData(null)
      setLoading(true)
    }
    const params = new URLSearchParams()
    params.set("client", editClientId)
    params.set("month", String(m))
    params.set("year", String(y))
    if (editPropertyId) params.set("property", editPropertyId)
    router.replace(`/clients/statements?${params.toString()}`)
  }

  const openStatementEditor = (row: StatementOverviewRow) => {
    const cacheKey = statementsCacheKey(row.month, row.year, row.clientId)
    const cached = statementsCacheRef.current.get(cacheKey)
    if (cached) {
      setData(cached)
      setLoading(false)
      setRefreshing(false)
    } else {
      setData(null)
      setLoading(true)
      setRefreshing(false)
    }
    const params = new URLSearchParams()
    params.set("client", row.clientId)
    params.set("month", String(row.month))
    params.set("year", String(row.year))
    if (row.propertyId) params.set("property", row.propertyId)
    router.push(`/clients/statements?${params.toString()}`)
  }

  const backToOverview = () => {
    const params = new URLSearchParams()
    const tabForPeriod = (() => {
      const now = periodTabToMonthYear("current")
      if (month === now.month && year === now.year) return "current"
      const prev = periodTabToMonthYear("previous")
      if (month === prev.month && year === prev.year) return "previous"
      const next = periodTabToMonthYear("future")
      if (month === next.month && year === next.year) return "future"
      return null
    })()
    if (tabForPeriod && tabForPeriod !== "current") params.set("period", tabForPeriod)
    const q = params.toString()
    router.push(q ? `/clients/statements?${q}` : "/clients/statements")
  }

  const downloadOverviewPdf = async (row: StatementOverviewRow) => {
    if (!row.fileUrl) return
    try {
      const url = await fetchStatementSignedUrl(row.fileUrl)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open PDF.")
    }
  }

  const dataReady = data != null && data.month === month && data.year === year
  const clients = dataReady ? data.clients : []
  const overviewRows = useMemo(
    () => (data ? flattenClientsToOverviewRows(data.clients, month, year) : []),
    [data, month, year]
  )

  useEffect(() => {
    if (!isEditMode || !editClientId || !dataReady) return

    const prefetch = (m: number, y: number) => {
      const key = statementsCacheKey(m, y, editClientId)
      if (statementsCacheRef.current.has(key)) return
      const params = new URLSearchParams({
        month: String(m),
        year: String(y),
        clientId: editClientId,
      })
      fetch(`/api/clients/statements?${params.toString()}`)
        .then((r) => r.json())
        .then((json: StatementsResponse) => {
          statementsCacheRef.current.set(key, json)
        })
        .catch(() => {})
    }

    const prev =
      month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year }
    const next =
      month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year }

    const timer = setTimeout(() => {
      prefetch(prev.m, prev.y)
      prefetch(next.m, next.y)
    }, 800)

    return () => clearTimeout(timer)
  }, [isEditMode, editClientId, dataReady, month, year])

  const selectedClient = isEditMode
    ? (clients.find((c) => c.clientId === editClientId) ?? null)
    : null

  const generateAll = async () => {
    setBatchLoading(true)
    try {
      const res = await fetch("/api/clients/statements/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      })
      const json = (await res.json()) as {
        generated: number
        skipped: number
        errors: string[]
        error?: string
      }
      if (!res.ok) {
        toast.error(json.error ?? "Batch generate failed.")
        return
      }
      if (json.generated > 0) {
        toast.success(`Generated ${json.generated} statement(s). Skipped ${json.skipped}.`)
      } else if (json.errors.length > 0) {
        toast.error(
          json.errors.length === 1
            ? json.errors[0]
            : `No statements generated (${json.errors.length} failed). First: ${json.errors[0]}`
        )
      } else {
        toast.info(
          `No statements generated. ${json.skipped} propert${json.skipped === 1 ? "y" : "ies"} had no eligible bookings for this month.`
        )
      }
      if (json.errors.length > 0 && json.generated > 0) {
        console.warn("[Generate all] partial failures:", json.errors)
      }
      await fetchStatements()
    } catch {
      toast.error("Batch generate failed.")
    } finally {
      setBatchLoading(false)
    }
  }

  const editProperty =
    selectedClient && editPropertyId
      ? selectedClient.properties.find((p) => p.propertyId === editPropertyId)
      : null
  const defaultEditProperty = selectedClient?.properties[0] ?? null
  const activeProperty = editProperty ?? defaultEditProperty

  return (
    <div className="min-h-[600px] rounded-xl bg-[#f0f4f8] p-4">
      <div className="space-y-4">
        {!isEditMode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">
              Owner payout statements by period. Use <strong>View</strong> to correct bookings,
              expenses, or PDFs.
            </p>
            <ClientsMonthToolbarButton
              loading={batchLoading || loading}
              label="Generate all"
              onClick={generateAll}
            />
          </div>
        ) : null}

        {isEditMode ? (
          loading && !dataReady ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !selectedClient || !activeProperty ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <Button type="button" variant="ghost" size="sm" onClick={backToOverview}>
                <ArrowLeft className="mr-1 size-4" />
                All statements
              </Button>
              <p className="text-sm text-slate-600">Client or property not found for this period.</p>
            </div>
          ) : (
            <div
              className={`relative space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-opacity ${refreshing ? "pointer-events-none opacity-60" : ""}`}
            >
              {refreshing ? (
                <div
                  className="absolute top-4 right-4 flex items-center gap-2 text-xs text-slate-500"
                  aria-live="polite"
                >
                  <Loader2 className="size-3.5 animate-spin" />
                  Updating…
                </div>
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={backToOverview}>
                  <ArrowLeft className="mr-1 size-4" />
                  All statements
                </Button>
                <ClientsMonthToolbar
                  compact
                  month={month}
                  year={year}
                  onMonthChange={(m) => setEditPeriod(m, year)}
                  onYearChange={(y) => setEditPeriod(month, y)}
                />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{selectedClient.clientName}</h2>
                <p className="mt-1 text-sm text-slate-500">{activeProperty.propertyName}</p>
                {selectedClient.clientEmail ? (
                  <p className="text-sm text-slate-500">{selectedClient.clientEmail}</p>
                ) : null}
              </div>

              {selectedClient.properties.length > 1 ? (
                <Tabs
                  value={activeProperty.propertyId}
                  onValueChange={(propertyId) => {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set("property", propertyId)
                    router.replace(`/clients/statements?${params.toString()}`)
                  }}
                >
                  <TabsList className="flex h-auto flex-wrap">
                    {selectedClient.properties.map((p) => (
                      <TabsTrigger key={p.propertyId} value={p.propertyId}>
                        {p.propertyName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="mt-4">
                    <PropertyStatementPanel
                      key={activeProperty.propertyId}
                      clientId={selectedClient.clientId}
                      statement={activeProperty}
                      month={month}
                      year={year}
                      onStatementUpdated={handleStatementUpdated}
                    />
                  </div>
                </Tabs>
              ) : (
                <PropertyStatementPanel
                  key={activeProperty.propertyId}
                  clientId={selectedClient.clientId}
                  statement={activeProperty}
                  month={month}
                  year={year}
                  onStatementUpdated={handleStatementUpdated}
                />
              )}
            </div>
          )
        ) : (
          <>
            <ClientsStatementsPortfolioSummary
              clients={clients}
              month={month}
              year={year}
              loading={loading}
            />
            <ClientsStatementsOverview
              periodTab={periodTab}
              onPeriodTabChange={setPeriodTab}
              customPeriod={{ month, year }}
              onCustomPeriodChange={setCustomPeriod}
              rows={overviewRows}
              loading={loading}
              onOpenStatement={openStatementEditor}
              onDownloadPdf={(row) => void downloadOverviewPdf(row)}
            />
          </>
        )}
      </div>
    </div>
  )
}
