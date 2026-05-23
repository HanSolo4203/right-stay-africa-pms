"use client"

import { BookingStatus } from "@prisma/client"
import { parseISO } from "date-fns"
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import type { BookingListRow } from "@/components/bookings/booking-list"
import { deleteStatement } from "@/app/(dashboard)/properties/[id]/statements/actions"
import { BookingDetailSheet } from "@/components/financials/booking-detail-sheet"
import { GenerateOwnerStatementModal } from "@/components/financials/generate-owner-statement-modal"
import { StatementBookingSubsection } from "@/components/financials/statement-booking-subsection"
import { UploadStatementModal } from "@/components/financials/upload-statement-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import {
  applyPayoutFilter,
  formatStatementMonthYear,
  type PayoutFilter,
} from "@/lib/clients/statement-booking-ui"
import {
  checkInInCalendarMonth,
  nextCalendarMonth,
  previousCalendarMonth,
} from "@/lib/owner-statement/statement-eligibility"
import { type ReceiptCategoryValue } from "@/lib/types/receipt"

type StatementItem = {
  id: string
  month: number
  year: number
  file_name: string | null
  file_url: string | null
  notes: string | null
  created_at: string
  source: "UPLOADED" | "GENERATED"
  status: "DRAFT" | "FINAL" | null
  snapshot: unknown
}

type StatementsListProps = {
  propertyId: string
  propertyName: string
  propertyCommissionPercent: number | null
  welcomePackFeePerBooking: number
  statements: StatementItem[]
  userRole: "SUPER_ADMIN" | "PROPERTY_MANAGER" | "OWNER" | null
  bookings: BookingListRow[]
  receipts: Array<{
    id: string
    date: string
    supplier: string
    amount: string
    category: ReceiptCategoryValue
  }>
}

const STATEMENTS_BUCKET = "documents"

const MONTH_OPTIONS = [
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

const STATEMENT_ACTIVE = new Set<BookingStatus>([
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.CHECKED_OUT,
])

function checkInInMonth(booking: BookingListRow, year: number, month: number): boolean {
  const d = parseISO(booking.check_in)
  if (Number.isNaN(d.getTime())) return false
  return checkInInCalendarMonth(d, year, month)
}

const PdfViewer = dynamic(
  () => import("@/components/shared/pdf-viewer").then((module) => module.PdfViewer),
  { ssr: false, loading: () => null }
)

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function statementBadges(item: StatementItem) {
  const out: ReactNode[] = []
  if (item.source === "UPLOADED") {
    out.push(
      <Badge key="u" variant="secondary" className="font-normal">
        Uploaded
      </Badge>
    )
  } else {
    out.push(
      <Badge key="g" variant="outline" className="border-teal-300 font-normal text-teal-800">
        Generated
      </Badge>
    )
    if (item.status === "DRAFT") {
      out.push(
        <Badge key="d" variant="outline" className="font-normal text-amber-800">
          Draft
        </Badge>
      )
    } else if (item.status === "FINAL") {
      out.push(
        <Badge key="f" variant="outline" className="font-normal text-slate-700">
          Final
        </Badge>
      )
    }
  }
  return <span className="flex flex-wrap gap-1">{out}</span>
}

export function StatementsList({
  propertyId,
  propertyName,
  propertyCommissionPercent,
  welcomePackFeePerBooking,
  statements,
  userRole,
  bookings,
  receipts,
}: StatementsListProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isFetchingSignedUrl, startSignedUrlTransition] = useTransition()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateTabPrefill, setGenerateTabPrefill] = useState<{
    year: number
    month: number
    bookingIds: string[]
  } | null>(null)
  const [editInitial, setEditInitial] = useState<{ statementId: string; snapshot: unknown } | null>(null)
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>("all")
  const [statementTabSelectedIds, setStatementTabSelectedIds] = useState<Set<string>>(() => new Set())
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSignedUrl, setViewerSignedUrl] = useState("")
  const [viewerFileName, setViewerFileName] = useState("")
  const [detailBooking, setDetailBooking] = useState<BookingListRow | null>(null)

  const canUpload = userRole === "SUPER_ADMIN" || userRole === "PROPERTY_MANAGER"
  const canDelete = userRole === "SUPER_ADMIN"

  const y = Number(selectedYear)
  const m = Number(selectedMonth)
  const prevPeriod =
    Number.isFinite(y) && Number.isFinite(m) ? previousCalendarMonth(y, m) : null
  const nextPeriod =
    Number.isFinite(y) && Number.isFinite(m) ? nextCalendarMonth(y, m) : null

  const years = useMemo(() => {
    const yearSet = new Set<number>([new Date().getFullYear(), ...statements.map((item) => item.year)])
    for (const b of bookings) {
      const d = parseISO(b.check_in)
      if (!Number.isNaN(d.getTime())) yearSet.add(d.getFullYear())
    }
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [statements, bookings])

  const rows = useMemo(() => {
    return statements
      .filter((item) => item.year === y && item.month === m)
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year
        if (b.month !== a.month) return b.month - a.month
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [y, m, statements])

  const bookingsCheckInThisMonth = useMemo(() => {
    if (!Number.isFinite(y) || !Number.isFinite(m)) return []
    return bookings
      .filter((b) => checkInInMonth(b, y, m) && STATEMENT_ACTIVE.has(b.status))
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [bookings, y, m])

  const bookingsCheckInPrevMonth = useMemo(() => {
    if (!prevPeriod) return []
    return bookings
      .filter(
        (b) =>
          checkInInMonth(b, prevPeriod.year, prevPeriod.month) && STATEMENT_ACTIVE.has(b.status)
      )
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [bookings, prevPeriod])

  const bookingsCheckInNextMonth = useMemo(() => {
    if (!nextPeriod) return []
    return bookings
      .filter(
        (b) =>
          checkInInMonth(b, nextPeriod.year, nextPeriod.month) && STATEMENT_ACTIVE.has(b.status)
      )
      .sort((a, b) => parseISO(a.check_in).getTime() - parseISO(b.check_in).getTime())
  }, [bookings, nextPeriod])

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

  // Default selection when the statement *period* changes only. Do not depend on
  // `bookings` array identity — the parent often passes a new reference each render,
  // which would re-run this effect after every click and either fight toggles or
  // reset to "all unpaid" via the previous setsEqual/next logic.
  useEffect(() => {
    if (!Number.isFinite(y) || !Number.isFinite(m)) return
    const unpaidThis = bookingsCheckInThisMonth.filter((b) => !b.owner_statement_id)
    const unpaidPrev = bookingsCheckInPrevMonth.filter((b) => !b.owner_statement_id)
    setStatementTabSelectedIds(new Set([...unpaidThis, ...unpaidPrev].map((b) => b.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: period change only
  }, [y, m])

  const getSignedUrl = async (path: string) => {
    const response = await fetch(
      `/api/storage/signed-url?bucket=${encodeURIComponent(STATEMENTS_BUCKET)}&path=${encodeURIComponent(path)}`
    )
    const payload = (await response.json()) as { signedUrl?: string; error?: string }
    if (!response.ok || !payload.signedUrl) {
      throw new Error(payload.error ?? "Failed to get signed URL.")
    }
    return payload.signedUrl
  }

  const onView = (filePath: string, fileName: string) => {
    startSignedUrlTransition(async () => {
      try {
        const signedUrl = await getSignedUrl(filePath)
        setViewerSignedUrl(signedUrl)
        setViewerFileName(fileName)
        setViewerOpen(true)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open statement."
        toast.error(message)
      }
    })
  }

  const onDownload = (filePath: string) => {
    startSignedUrlTransition(async () => {
      try {
        const signedUrl = await getSignedUrl(filePath)
        window.open(signedUrl, "_blank", "noopener,noreferrer")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to download statement."
        toast.error(message)
      }
    })
  }

  const onDelete = (id: string) => {
    startDeleteTransition(async () => {
      try {
        await deleteStatement(id)
        router.refresh()
        toast.success("Statement deleted")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete statement."
        toast.error(message)
      }
    })
  }

  const openGenerateNew = () => {
    setEditInitial(null)
    setGenerateTabPrefill({
      year: y,
      month: m,
      bookingIds: Array.from(statementTabSelectedIds),
    })
    setGenerateOpen(true)
  }

  const openContinueDraft = (item: StatementItem) => {
    setGenerateTabPrefill(null)
    setEditInitial({ statementId: item.id, snapshot: item.snapshot })
    setGenerateOpen(true)
  }

  const handleGenerateOpenChange = (next: boolean) => {
    setGenerateOpen(next)
    if (!next) {
      setEditInitial(null)
      setGenerateTabPrefill(null)
    }
  }

  const toggleTabBookingSelect = (id: string) => {
    setStatementTabSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllUnpaidOnTab = () => {
    const unpaidThis = bookingsCheckInThisMonth.filter((b) => !b.owner_statement_id)
    const unpaidPrev = bookingsCheckInPrevMonth.filter((b) => !b.owner_statement_id)
    setStatementTabSelectedIds(new Set([...unpaidThis, ...unpaidPrev].map((b) => b.id)))
  }

  const selectAllUnpaidPrevOnTab = () => {
    const unpaidPrev = bookingsCheckInPrevMonth.filter((b) => !b.owner_statement_id)
    setStatementTabSelectedIds((prev) => {
      const next = new Set(prev)
      for (const b of unpaidPrev) next.add(b.id)
      return next
    })
  }

  const clearTabBookingSelect = () => {
    setStatementTabSelectedIds(new Set())
  }

  return (
    <Card className="bg-white">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Year</span>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Month</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((mo) => (
                      <SelectItem key={mo.value} value={String(mo.value)}>
                        {mo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Payout status</span>
                <Select
                  value={payoutFilter}
                  onValueChange={(v) => setPayoutFilter(v as PayoutFilter)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All active bookings</SelectItem>
                    <SelectItem value="unpaid">Not on a statement yet</SelectItem>
                    <SelectItem value="paid">Paid (on a statement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canUpload ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="default" onClick={openGenerateNew}>
                  Generate owner statement
                </Button>
                <Button type="button" variant="outline" onClick={() => setUploadOpen(true)}>
                  Upload PDF
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Bookings (CSV)</h3>
                <p className="text-xs text-muted-foreground">
                  Amounts from your Uplisting import. &quot;Paid&quot; means the booking is on a finalized owner
                  statement. Tick <strong>Include</strong> for this period and click Generate. The grey sections show
                  the previous and next calendar month; carry-in from the prior month can be included on this
                  statement. Click a <strong>guest name</strong> for full booking and CSV fields.
                </p>
              </div>
              {canUpload ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllUnpaidOnTab}>
                    Select all unpaid
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearTabBookingSelect}>
                    Clear selection
                  </Button>
                </div>
              ) : null}
            </div>

            <StatementBookingSubsection
              title={`Check-in ${formatStatementMonthYear(m, y)}`}
              description="Primary stays for the selected statement month."
              rows={displayBookings}
              canSelect={canUpload}
              selectedIds={statementTabSelectedIds}
              onToggle={toggleTabBookingSelect}
              onOpenDetail={setDetailBooking}
              includeMode="statement-eligible"
              emptyMessage="No active bookings with check-in in this month (for the current payout filter)."
            />

            {prevPeriod ? (
              <StatementBookingSubsection
                title={`Previous month — check-in ${formatStatementMonthYear(prevPeriod.month, prevPeriod.year)}`}
                description="Optional carry-in: include these on this period’s statement when payout aligns with the month above (e.g. late check-in in the prior month)."
                rows={displayBookingsPrev}
                canSelect={canUpload}
                selectedIds={statementTabSelectedIds}
                onToggle={toggleTabBookingSelect}
                onOpenDetail={setDetailBooking}
                includeMode="statement-eligible"
                greyed
                emptyMessage="No active bookings in the previous calendar month (for the current payout filter)."
                headerActions={
                  canUpload ? (
                    <Button type="button" variant="outline" size="sm" onClick={selectAllUnpaidPrevOnTab}>
                      Add all unpaid (carry-in)
                    </Button>
                  ) : null
                }
              />
            ) : null}

            {nextPeriod ? (
              <StatementBookingSubsection
                title={`Next month — check-in ${formatStatementMonthYear(nextPeriod.month, nextPeriod.year)}`}
                description="Upcoming stays for planning. To add them to a statement, change the month/year filters to that period — they cannot be attached to the current statement month."
                rows={displayBookingsNext}
                canSelect={canUpload}
                selectedIds={statementTabSelectedIds}
                onToggle={toggleTabBookingSelect}
                onOpenDetail={setDetailBooking}
                includeMode="next-month"
                greyed
                emptyMessage="No active bookings in the next calendar month (for the current payout filter)."
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Statements — {formatStatementMonthYear(m, y)}
          </h3>
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No statements for this month yet
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Name / type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => {
                const hasFile = Boolean(item.file_url)
                const isDraftGenerated = item.source === "GENERATED" && item.status === "DRAFT"
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{formatStatementMonthYear(item.month, item.year)}</div>
                      <div className="mt-1">{statementBadges(item)}</div>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">{item.file_name ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{item.notes ?? "—"}</TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        {canUpload && item.source === "GENERATED" && (item.status === "DRAFT" || item.status === "FINAL") ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openContinueDraft(item)}
                          >
                            {item.status === "DRAFT" ? "Continue draft" : "Edit statement"}
                          </Button>
                        ) : null}
                        {hasFile ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onView(item.file_url!, item.file_name ?? "statement.pdf")}
                              disabled={isFetchingSignedUrl}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onDownload(item.file_url!)}
                              disabled={isFetchingSignedUrl}
                            >
                              Download
                            </Button>
                          </>
                        ) : null}
                        {canDelete ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="destructive" size="sm" disabled={isDeleting}>
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete statement?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the record and any stored PDF. Linked bookings will be available
                                  for a new statement again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => onDelete(item.id)}
                                >
                                  Confirm delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
            </div>
          )}
        </div>

        <UploadStatementModal propertyId={propertyId} open={uploadOpen} onOpenChange={setUploadOpen} />
        {detailBooking ? (
          <BookingDetailSheet
            key={detailBooking.id}
            booking={detailBooking}
            onClose={() => setDetailBooking(null)}
          />
        ) : null}
        <GenerateOwnerStatementModal
          propertyId={propertyId}
          propertyName={propertyName}
          propertyCommissionPercent={propertyCommissionPercent}
          welcomePackFeePerBooking={welcomePackFeePerBooking}
          bookings={bookings}
          receipts={receipts}
          open={generateOpen}
          onOpenChange={handleGenerateOpenChange}
          initialEdit={editInitial}
          tabPrefill={generateTabPrefill}
          onCompleted={() => router.refresh()}
        />
        {viewerSignedUrl ? (
          <PdfViewer
            signedUrl={viewerSignedUrl}
            fileName={viewerFileName}
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            hideTrigger
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
