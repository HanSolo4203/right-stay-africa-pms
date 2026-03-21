"use client"

import { useMemo, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"

type StatementItem = {
  id: string
  month: number
  year: number
  file_name: string | null
  file_url: string | null
  notes: string | null
  created_at: string
}

type OwnerStatementsListProps = {
  statements: StatementItem[]
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

export function OwnerStatementsList({ statements }: OwnerStatementsListProps) {
  const [isFetchingSignedUrl, startSignedUrlTransition] = useTransition()
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSignedUrl, setViewerSignedUrl] = useState("")
  const [viewerFileName, setViewerFileName] = useState("")

  const years = useMemo(() => {
    const yearSet = new Set<number>([new Date().getFullYear(), ...statements.map((item) => item.year)])
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [statements])

  const rows = useMemo(() => {
    return statements
      .filter((item) => item.year === Number(selectedYear))
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year
        if (b.month !== a.month) return b.month - a.month
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [selectedYear, statements])

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

  return (
    <Card className="bg-white">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
        </div>

        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No statements for this year.
          </p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rows.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="font-medium text-slate-900">{formatMonthYear(item.month, item.year)}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.notes?.trim() ? item.notes : "—"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.file_url ? (
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
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">{formatMonthYear(item.month, item.year)}</TableCell>
                      <TableCell className="max-w-[320px] text-slate-600">
                        {item.notes?.trim() ? item.notes : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {item.file_url ? (
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
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
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
