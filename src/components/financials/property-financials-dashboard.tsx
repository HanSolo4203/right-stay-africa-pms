"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import { ExternalLink } from "lucide-react"
import { deleteStatement } from "@/app/(dashboard)/properties/[id]/statements/actions"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import {
  aggregatePropertyStatementFinancials,
  sortGeneratedStatements,
  statementFinancialColumns,
  statementsHubEditUrl,
  type PropertyStatementRecord,
} from "@/lib/clients/property-statement-financials"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"

export type PropertyFinancialsStatementItem = PropertyStatementRecord

type PropertyFinancialsDashboardProps = {
  propertyId: string
  clientId: string | null
  statements: PropertyFinancialsStatementItem[]
  userRole: "SUPER_ADMIN" | "PROPERTY_MANAGER" | "OWNER" | null
}

const STATEMENTS_BUCKET = "documents"

const PdfViewer = dynamic(
  () => import("@/components/shared/pdf-viewer").then((module) => module.PdfViewer),
  { ssr: false, loading: () => null }
)

function formatMonthYear(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

export { statementsHubEditUrl } from "@/lib/clients/property-statement-financials"

function statementBadges(item: PropertyFinancialsStatementItem): ReactNode {
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

function SummaryMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function PropertyFinancialsSummary({
  statements,
  userRole,
}: PropertyFinancialsDashboardProps) {
  const generated = useMemo(() => sortGeneratedStatements(statements), [statements])
  const agg = useMemo(() => aggregatePropertyStatementFinancials(generated), [generated])
  const canManage = userRole === "SUPER_ADMIN" || userRole === "PROPERTY_MANAGER"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Financial summary</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Totals across {agg.withSnapshot} generated statement
            {agg.withSnapshot === 1 ? "" : "s"} with saved figures (same snapshot totals as the
            Statements hub).
          </p>
        </div>
        {canManage ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/clients/statements">
              <ExternalLink className="mr-1.5 size-4" />
              Statements hub
            </Link>
          </Button>
        ) : null}
      </div>

      {generated.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No owner statements yet. Create and edit statements from the{" "}
            <Link href="/clients/statements" className="font-medium text-teal-800 underline-offset-2 hover:underline">
              Statements hub
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryMetric
            label="Total owner payouts"
            value={formatMoneyZar(agg.ownerPayouts)}
            hint={`${agg.withSnapshot} period${agg.withSnapshot === 1 ? "" : "s"}`}
          />
          <SummaryMetric label="Gross revenue" value={formatMoneyZar(agg.grossRevenue)} />
          <SummaryMetric label="Booking fees (OTA)" value={formatMoneyZar(agg.bookingFees)} />
          <SummaryMetric label="Management fees" value={formatMoneyZar(agg.managementFees)} />
          <SummaryMetric label="Additional expenses" value={formatMoneyZar(agg.additionalExpenses)} />
          <SummaryMetric
            label="Statements on file"
            value={String(agg.statementCount)}
            hint="Generated owner statements"
          />
        </div>
      )}
    </div>
  )
}

export function PropertyFinancialsStatementsHistory({
  propertyId,
  clientId,
  statements,
  userRole,
}: PropertyFinancialsDashboardProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isFetchingSignedUrl, startSignedUrlTransition] = useTransition()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSignedUrl, setViewerSignedUrl] = useState("")
  const [viewerFileName, setViewerFileName] = useState("")

  const canManage = userRole === "SUPER_ADMIN" || userRole === "PROPERTY_MANAGER"
  const canDelete = userRole === "SUPER_ADMIN"
  const generated = useMemo(() => sortGeneratedStatements(statements), [statements])

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

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Statement history</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Generated owner statements for this property. Edit bookings, expenses, or PDFs on the
              Statements hub — figures below match saved snapshots there.
            </p>
          </div>
          {canManage ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/clients/statements">
                <ExternalLink className="mr-1.5 size-4" />
                Statements hub
              </Link>
            </Button>
          ) : null}
        </div>

        {generated.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No owner statements yet.{" "}
              {canManage ? (
                <>
                  <Link
                    href="/clients/statements"
                    className="font-medium text-teal-800 underline-offset-2 hover:underline"
                  >
                    Create one on the Statements hub
                  </Link>
                  .
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Owner payout</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Mgmt fees</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generated.map((item) => {
                  const cols = statementFinancialColumns(item)
                  const hasFile = Boolean(item.file_url)
                  const editUrl = statementsHubEditUrl(clientId, propertyId, item.month, item.year)

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{formatMonthYear(item.month, item.year)}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{formatDate(item.created_at)}</div>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {cols.netToOwner != null ? formatMoneyZar(cols.netToOwner) : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-700">
                        {cols.grossRevenue != null ? formatMoneyZar(cols.grossRevenue) : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-700">
                        {cols.managementFees != null ? formatMoneyZar(cols.managementFees) : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-700">
                        {cols.expenses != null ? formatMoneyZar(cols.expenses) : "—"}
                      </TableCell>
                      <TableCell>{statementBadges(item)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          {canManage ? (
                            <Button type="button" variant="secondary" size="sm" asChild>
                              <Link href={editUrl}>
                                {item.status === "DRAFT" ? "Continue draft" : "Edit on hub"}
                              </Link>
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
                                    This removes the record and any stored PDF. Linked bookings will be
                                    available for a new statement again.
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
