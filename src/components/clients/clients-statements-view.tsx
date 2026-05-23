"use client"

import { parseISO } from "date-fns"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import {
  ClientsStatementsOverview,
  flattenClientsToOverviewRows,
  type StatementOverviewRow,
} from "@/components/clients/clients-statements-overview"
import { StatementBookingSubsection } from "@/components/financials/statement-booking-subsection"
import { ClientsMonthToolbarButton } from "@/components/clients/clients-month-toolbar"
import { StatementAdditionalExpenses } from "@/components/clients/statement-additional-expenses"
import { StatementPayoutSummary } from "@/components/clients/statement-payout-summary"
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
  applyPayoutFilter,
  clientBookingRowToInput,
  formatStatementMonthYear,
  isStatementActiveBooking,
  type PayoutFilter,
} from "@/lib/clients/statement-booking-ui"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import {
  checkInInCalendarMonth,
  nextCalendarMonth,
  previousCalendarMonth,
} from "@/lib/owner-statement/statement-eligibility"
import {
  isStatementPeriodTab,
  periodTabToMonthYear,
  type StatementPeriodTab,
} from "@/lib/clients/statement-period-tabs"
import { buildPropertyStatement } from "@/lib/statement-calculator"
import type { ClientStatementBookingRow, ClientStatementSummary, PropertyStatement } from "@/types/statement"

function checkInInMonth(booking: ClientStatementBookingRow, year: number, month: number): boolean {
  const d = parseISO(booking.check_in)
  if (Number.isNaN(d.getTime())) return false
  return checkInInCalendarMonth(d, year, month)
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
  onStatementUpdated: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [fileViewerOpen, setFileViewerOpen] = useState(false)
  const [fileViewerUrl, setFileViewerUrl] = useState("")
  const [fileViewerName, setFileViewerName] = useState("")
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(statement.lines.map((l) => l.bookingId)))
  const [manualExpenses, setManualExpenses] = useState(statement.manualExpenses)
  const [existingStatementId, setExistingStatementId] = useState<string | null>(
    statement.existingStatementId
  )
  const [existingStatementStatus, setExistingStatementStatus] = useState<
    PropertyStatement["existingStatementStatus"]
  >(statement.existingStatementStatus)

  const periodLabel = formatPeriod(month, year)
  const prevPeriod = useMemo(() => previousCalendarMonth(year, month), [year, month])
  const nextPeriod = useMemo(() => nextCalendarMonth(year, month), [year, month])

  useEffect(() => {
    setManualExpenses(statement.manualExpenses)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when statement period or property changes
  }, [month, year, statement.propertyId, statement.existingStatementId])

  const activeBookings = useMemo(
    () => statement.bookings.filter((b) => isStatementActiveBooking(b.status)),
    [statement.bookings]
  )

  const bookingsCheckInThisMonth = useMemo(() => {
    return activeBookings
      .filter((b) => checkInInMonth(b, year, month))
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [activeBookings, year, month])

  const bookingsCheckInPrevMonth = useMemo(() => {
    if (!prevPeriod) return []
    return activeBookings
      .filter((b) => checkInInMonth(b, prevPeriod.year, prevPeriod.month))
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [activeBookings, prevPeriod])

  const bookingsCheckInNextMonth = useMemo(() => {
    if (!nextPeriod) return []
    return activeBookings
      .filter((b) => checkInInMonth(b, nextPeriod.year, nextPeriod.month))
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [activeBookings, nextPeriod])

  const displayBookings = useMemo(
    () => applyPayoutFilter(bookingsCheckInThisMonth, payoutFilter),
    [bookingsCheckInThisMonth, payoutFilter]
  )
  const displayBookingsPrev = useMemo(
    () => applyPayoutFilter(bookingsCheckInPrevMonth, payoutFilter),
    [bookingsCheckInPrevMonth, payoutFilter]
  )
  const displayBookingsNext = useMemo(
    () => applyPayoutFilter(bookingsCheckInNextMonth, payoutFilter),
    [bookingsCheckInNextMonth, payoutFilter]
  )

  const selectedStatement = useMemo(() => {
    const selected = activeBookings.filter((b) => selectedIds.has(b.id))
    return buildPropertyStatement({
      propertyId: statement.propertyId,
      propertyName: statement.propertyName,
      month,
      year,
      commissionPercentProperty: statement.managementFeePercent,
      managementFeeType: statement.managementFeeType,
      welcomePackFeePerBooking: statement.welcomePackFeePerBooking,
      bookings: selected.map(clientBookingRowToInput),
      manualExpenses,
      existingStatementId,
      existingStatementStatus,
      hasPdf: statement.hasPdf,
      isVirtualClient: statement.isVirtualClient,
    })
  }, [
    activeBookings,
    selectedIds,
    statement,
    month,
    year,
    manualExpenses,
    existingStatementId,
    existingStatementStatus,
  ])

  const toggleBooking = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllUnpaid = () => {
    const unpaidThis = bookingsCheckInThisMonth.filter((b) => !b.owner_statement_id)
    const unpaidPrev = bookingsCheckInPrevMonth.filter((b) => !b.owner_statement_id)
    setSelectedIds(new Set([...unpaidThis, ...unpaidPrev].map((b) => b.id)))
  }

  const selectAllUnpaidPrev = () => {
    const unpaidPrev = bookingsCheckInPrevMonth.filter((b) => !b.owner_statement_id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const b of unpaidPrev) next.add(b.id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const statementPayload = () => ({
    clientId,
    propertyId: statement.propertyId,
    month,
    year,
    bookingIds: Array.from(selectedIds),
    statementId: existingStatementId,
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
      const data = (await res.json()) as { statementId?: string; error?: string }
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
      onStatementUpdated()
    } catch {
      toast.error("Failed to save draft.")
    } finally {
      setSavingDraft(false)
    }
  }

  const downloadPdf = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one booking to include.")
      return
    }
    setGenerating(true)
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
      toast.success(
        existingStatementStatus === "FINAL"
          ? "Statement updated and downloaded."
          : "Statement finalized and downloaded."
      )
      onStatementUpdated()
    } catch {
      toast.error("Failed to generate PDF.")
    } finally {
      setGenerating(false)
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
    setGenerating(true)
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
      setGenerating(false)
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

  return (
    <div className="space-y-8">
      <StatementPayoutSummary
        statement={preview}
        periodLabel={periodLabel}
        selectedBookingCount={preview.lines.length}
      />

      {existingStatementStatus === "FINAL" && statement.hasPdf ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
          A finalized statement is on file for this period. Change bookings or expenses below, then use{" "}
          <strong>Update &amp; download PDF</strong> to replace it (same as property Financials → Edit
          statement).
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={
            savingDraft ||
            generating ||
            selectedIds.size === 0 ||
            statement.isVirtualClient
          }
          onClick={() => void saveDraft()}
        >
          {savingDraft ? <Loader2 className="size-4 animate-spin" /> : null}
          {existingStatementStatus === "FINAL" ? "Revert to draft" : "Save as draft"}
        </Button>
        <Button
          type="button"
          className="bg-emerald-700 hover:bg-emerald-800"
          disabled={generating || savingDraft || selectedIds.size === 0}
          onClick={downloadPdf}
        >
          {generating ? <Loader2 className="size-4 animate-spin" /> : null}
          {existingStatementStatus === "FINAL" ? "Update & download PDF" : "Download PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={generating || savingDraft || selectedIds.size === 0}
          onClick={previewPdf}
        >
          Preview PDF
        </Button>
        {existingStatementStatus === "FINAL" && statement.existingStatementFileUrl ? (
          <Button
            type="button"
            variant="outline"
            disabled={generating || savingDraft}
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
              Paid bookings are already on a finalized statement. Carry-in from the previous month can be included on
              this statement.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Payout status</span>
              <Select value={payoutFilter} onValueChange={(v) => setPayoutFilter(v as PayoutFilter)}>
                <SelectTrigger className="w-[180px] bg-white">
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
          title={`Check-in ${formatStatementMonthYear(month, year)}`}
          description="Primary stays for the selected statement month."
          rows={displayBookings}
          canSelect
          selectedIds={selectedIds}
          onToggle={toggleBooking}
          includeMode="statement-eligible"
          emptyMessage="No active bookings with check-in in this month (for the current payout filter)."
        />

        <StatementBookingSubsection
          title={`Previous month — check-in ${formatStatementMonthYear(prevPeriod.month, prevPeriod.year)}`}
          description="Optional carry-in: include these on this period’s statement when payout aligns with the month above."
          rows={displayBookingsPrev}
          canSelect
          selectedIds={selectedIds}
          onToggle={toggleBooking}
          includeMode="statement-eligible"
          greyed
          emptyMessage="No active bookings in the previous calendar month (for the current payout filter)."
          headerActions={
            <Button type="button" variant="outline" size="sm" onClick={selectAllUnpaidPrev}>
              Add all unpaid (carry-in)
            </Button>
          }
        />

        <StatementBookingSubsection
          title={`Next month — check-in ${formatStatementMonthYear(nextPeriod.month, nextPeriod.year)}`}
          description="Upcoming stays for planning. Change the month/year above to generate a statement for that period."
          rows={displayBookingsNext}
          canSelect
          selectedIds={selectedIds}
          onToggle={toggleBooking}
          includeMode="next-month"
          greyed
          emptyMessage="No active bookings in the next calendar month (for the current payout filter)."
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.lines.map((line) => (
                <TableRow key={line.bookingId} className="border-b border-slate-100">
                  <TableCell>{line.guestName}</TableCell>
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
              </TableRow>
            </TableBody>
          </Table>
        </div>
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
          automaticExpenses={preview.automaticExpenses}
          welcomePackFeePerBooking={statement.welcomePackFeePerBooking}
          selectedBookingCount={preview.lines.length}
          disabled={statement.isVirtualClient}
          onManualExpenseAdded={(expense) =>
            setManualExpenses((prev) => [...prev, expense])
          }
          onManualExpenseRemoved={(id) =>
            setManualExpenses((prev) => prev.filter((e) => e.id !== id))
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
  const [batchLoading, setBatchLoading] = useState(false)
  const [data, setData] = useState<StatementsResponse | null>(null)

  const fetchStatements = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const res = await fetch(`/api/clients/statements?month=${month}&year=${year}`)
      const json = (await res.json()) as StatementsResponse & { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load statements.")
        return
      }
      setData(json)
    } catch {
      toast.error("Failed to load statements.")
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    void fetchStatements()
  }, [fetchStatements])

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

  const openStatementEditor = (row: StatementOverviewRow) => {
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

  const clients = data?.clients ?? []
  const overviewRows = useMemo(
    () => (data ? flattenClientsToOverviewRows(data.clients, month, year) : []),
    [data, month, year]
  )

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
          loading ? (
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
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={backToOverview}>
                  <ArrowLeft className="mr-1 size-4" />
                  All statements
                </Button>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{selectedClient.clientName}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatPeriod(month, year)}
                  {selectedClient.properties.length > 1 ? ` · ${activeProperty.propertyName}` : null}
                </p>
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
                  {selectedClient.properties.map((p) => (
                    <TabsContent key={p.propertyId} value={p.propertyId} className="mt-4">
                      <PropertyStatementPanel
                        clientId={selectedClient.clientId}
                        statement={p}
                        month={month}
                        year={year}
                        onStatementUpdated={() => void fetchStatements({ silent: true })}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <PropertyStatementPanel
                  clientId={selectedClient.clientId}
                  statement={activeProperty}
                  month={month}
                  year={year}
                  onStatementUpdated={() => void fetchStatements({ silent: true })}
                />
              )}
            </div>
          )
        ) : (
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
        )}
      </div>
    </div>
  )
}
