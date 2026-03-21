"use client"

import dynamic from "next/dynamic"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteReceipt } from "@/app/(dashboard)/properties/[id]/receipts/actions"
import {
  RECEIPT_CATEGORY_OPTIONS,
  ReceiptFormModal,
} from "@/components/financials/receipt-form-modal"
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
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { type ReceiptCategoryValue, type ReceiptFormItem } from "@/lib/types/receipt"

const RECEIPTS_BUCKET = "documents"
const PdfViewer = dynamic(
  () => import("@/components/shared/pdf-viewer").then((module) => module.PdfViewer),
  { ssr: false, loading: () => null }
)

type ReceiptsListProps = {
  propertyId: string
  receipts: ReceiptFormItem[]
  userRole: "SUPER_ADMIN" | "PROPERTY_MANAGER" | "OWNER" | null
}

const CATEGORY_STYLES: Record<ReceiptCategoryValue, string> = {
  MAINTENANCE: "bg-orange-100 text-orange-800",
  CLEANING: "bg-blue-100 text-blue-800",
  SUPPLIES: "bg-indigo-100 text-indigo-800",
  UTILITIES: "bg-yellow-100 text-yellow-800",
  RATES_TAXES: "bg-cyan-100 text-cyan-800",
  INSURANCE: "bg-emerald-100 text-emerald-800",
  OTHER: "bg-slate-100 text-slate-800",
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" })
const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatAmount(value: string) {
  return `R ${currencyFormatter.format(Number(value))}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function labelFromCategory(category: ReceiptCategoryValue) {
  return RECEIPT_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? "Other"
}

function isPdfFile(fileName: string | null) {
  return fileName?.toLowerCase().endsWith(".pdf") ?? false
}

export function ReceiptsList({ propertyId, receipts, userRole }: ReceiptsListProps) {
  const router = useRouter()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isFetchingSignedUrl, startSignedUrlTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<ReceiptFormItem | undefined>(undefined)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSignedUrl, setViewerSignedUrl] = useState("")
  const [viewerFileName, setViewerFileName] = useState("")

  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState("all")

  const canManage = userRole === "SUPER_ADMIN" || userRole === "PROPERTY_MANAGER"

  const years = useMemo(() => {
    const yearSet = new Set<number>([new Date().getFullYear(), ...receipts.map((item) => new Date(item.date).getFullYear())])
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [receipts])

  const filteredRows = useMemo(() => {
    const year = Number(selectedYear)
    const month = selectedMonth === "all" ? null : Number(selectedMonth)

    return receipts
      .filter((item) => {
        const date = new Date(item.date)
        if (date.getFullYear() !== year) return false
        if (month && date.getMonth() + 1 !== month) return false
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [receipts, selectedMonth, selectedYear])

  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, item) => sum + Number(item.amount), 0)
  }, [filteredRows])

  const periodLabel = useMemo(() => {
    if (selectedMonth === "all") return selectedYear
    return `${monthFormatter.format(new Date(Number(selectedYear), Number(selectedMonth) - 1, 1))} ${selectedYear}`
  }, [selectedMonth, selectedYear])

  const getSignedUrl = async (path: string) => {
    const response = await fetch(
      `/api/storage/signed-url?bucket=${encodeURIComponent(RECEIPTS_BUCKET)}&path=${encodeURIComponent(path)}`
    )
    const payload = (await response.json()) as { signedUrl?: string; error?: string }
    if (!response.ok || !payload.signedUrl) {
      throw new Error(payload.error ?? "Failed to get signed URL.")
    }
    return payload.signedUrl
  }

  const onDelete = (id: string) => {
    startDeleteTransition(async () => {
      try {
        await deleteReceipt(id)
        router.refresh()
        toast.success("Receipt deleted")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete receipt."
        toast.error(message)
      }
    })
  }

  const onViewFile = (item: ReceiptFormItem) => {
    if (!item.file_url || !item.file_name) return
    const fileUrl = item.file_url
    const fileName = item.file_name

    startSignedUrlTransition(async () => {
      try {
        const signedUrl = await getSignedUrl(fileUrl)
        if (isPdfFile(fileName)) {
          setViewerSignedUrl(signedUrl)
          setViewerFileName(fileName)
          setViewerOpen(true)
          return
        }
        window.open(signedUrl, "_blank", "noopener,noreferrer")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open receipt file."
        toast.error(message)
      }
    })
  }

  return (
    <Card className="bg-white">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Month</span>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <SelectItem key={month} value={String(month)}>
                    {monthFormatter.format(new Date(2000, month - 1, 1))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">Year</span>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select year" />
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

          {canManage ? (
            <Button
              type="button"
              onClick={() => {
                setEditingReceipt(undefined)
                setFormOpen(true)
              }}
            >
              Add Receipt
            </Button>
          ) : null}
        </div>

        {filteredRows.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No receipts yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.date)}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>
                    <Badge className={CATEGORY_STYLES[item.category]}>{labelFromCategory(item.category)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatAmount(item.amount)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {item.file_url && item.file_name ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onViewFile(item)}
                          disabled={isFetchingSignedUrl}
                        >
                          View file
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReceipt(item)
                            setFormOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canManage ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" size="sm" disabled={isDeleting}>
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete receipt?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the receipt record and its uploaded file (if any).
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
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right font-medium">
                  Total: R {currencyFormatter.format(totalAmount)} for {periodLabel}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}

        <ReceiptFormModal
          propertyId={propertyId}
          open={formOpen}
          onOpenChange={(nextOpen) => {
            setFormOpen(nextOpen)
            if (!nextOpen) {
              setEditingReceipt(undefined)
            }
          }}
          receipt={editingReceipt}
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
