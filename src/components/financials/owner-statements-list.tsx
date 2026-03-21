"use client"

import type { ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import type { BookingListRow } from "@/components/bookings/booking-list"
import { deleteStatement } from "@/app/(dashboard)/properties/[id]/statements/actions"
import { GenerateOwnerStatementModal } from "@/components/financials/generate-owner-statement-modal"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { type ReceiptCategoryValue } from "@/lib/types/receipt"

type OwnerStatementItem = {
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

type OwnerStatementsListProps = {
  propertyId: string
  propertyName: string
  propertyCommissionPercent: number | null
  statements: OwnerStatementItem[]
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

function statementBadges(item: OwnerStatementItem): ReactNode {
  const out: ReactNode[] = []
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
  return <span className="flex flex-wrap gap-1">{out}</span>
}

export function OwnerStatementsList({
  propertyId,
  propertyName,
  propertyCommissionPercent,
  statements,
  userRole,
  bookings,
  receipts,
}: OwnerStatementsListProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isFetchingSignedUrl, startSignedUrlTransition] = useTransition()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [editInitial, setEditInitial] = useState<{ statementId: string; snapshot: unknown } | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSignedUrl, setViewerSignedUrl] = useState("")
  const [viewerFileName, setViewerFileName] = useState("")

  const canManage = userRole === "SUPER_ADMIN" || userRole === "PROPERTY_MANAGER"
  const canDelete = userRole === "SUPER_ADMIN"

  const ownerStatements = useMemo(() => {
    return statements
      .filter((item) => item.source === "GENERATED")
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year
        if (b.month !== a.month) return b.month - a.month
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [statements])

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

  const openContinueDraft = (item: OwnerStatementItem) => {
    setEditInitial({ statementId: item.id, snapshot: item.snapshot })
    setGenerateOpen(true)
  }

  const handleGenerateOpenChange = (next: boolean) => {
    setGenerateOpen(next)
    if (!next) setEditInitial(null)
  }

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Owner statements</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            All generated owner statements (drafts and finals) for this property.
          </p>
        </div>

        {ownerStatements.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No owner statements yet. Go to the{" "}
              <strong>Statements</strong> tab to generate one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
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
                {ownerStatements.map((item) => {
                  const hasFile = Boolean(item.file_url)
                  const isDraft = item.source === "GENERATED" && item.status === "DRAFT"
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{formatMonthYear(item.month, item.year)}</div>
                        <div className="mt-1">{statementBadges(item)}</div>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">{item.file_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{item.notes ?? "—"}</TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          {canManage && isDraft ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => openContinueDraft(item)}
                            >
                              Continue draft
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

        <GenerateOwnerStatementModal
          propertyId={propertyId}
          propertyName={propertyName}
          propertyCommissionPercent={propertyCommissionPercent}
          bookings={bookings}
          receipts={receipts}
          open={generateOpen}
          onOpenChange={handleGenerateOpenChange}
          initialEdit={editInitial}
          tabPrefill={null}
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
