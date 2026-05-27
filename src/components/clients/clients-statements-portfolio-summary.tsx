"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Eye, FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  aggregatePortfolioFromClients,
  type PortfolioPeriodSummary,
} from "@/lib/clients/portfolio-period-summary"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ClientStatementSummary } from "@/types/statement"

const PdfViewer = dynamic(
  () => import("@/components/shared/pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false, loading: () => null }
)

function formatPeriod(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  })
}

function MetricBlock({
  label,
  finalised,
  preview,
  hint,
}: {
  label: string
  finalised: string
  preview: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">{finalised}</p>
      <p className="mt-1 text-sm tabular-nums text-slate-600">Preview: {preview}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function ClientsStatementsPortfolioSummary({
  clients,
  month,
  year,
  loading,
}: {
  clients: ClientStatementSummary[]
  month: number
  year: number
  loading?: boolean
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(true)
  const [isViewing, setIsViewing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")

  const summary: PortfolioPeriodSummary | null = useMemo(() => {
    if (clients.length === 0) return null
    return aggregatePortfolioFromClients(clients, month, year)
  }, [clients, month, year])

  const companyPdfFilename = `Right-Stay-Portfolio_${year}-${String(month).padStart(2, "0")}.pdf`

  const fetchCompanyPdfBlob = async (): Promise<Blob | null> => {
    const res = await fetch("/api/clients/statements/company-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? "Failed to generate company statement.")
      return null
    }
    return res.blob()
  }

  const viewCompanyStatement = async () => {
    setIsViewing(true)
    try {
      const blob = await fetchCompanyPdfBlob()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch {
      toast.error("Failed to generate company statement.")
    } finally {
      setIsViewing(false)
    }
  }

  const downloadPdf = async () => {
    setIsDownloading(true)
    try {
      const blob = await fetchCompanyPdfBlob()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = companyPdfFilename
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Company statement downloaded.")
    } catch {
      toast.error("Failed to generate company statement.")
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading || !summary) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Portfolio summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Loading period totals…</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Portfolio summary</CardTitle>
          <p className="mt-1 text-sm text-slate-600">{formatPeriod(month, year)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isViewing || isDownloading}
            onClick={() => void viewCompanyStatement()}
          >
            {isViewing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Eye className="size-4" />
            )}
            {isViewing ? "Generating…" : "View company statement"}
          </Button>
          <Button
            type="button"
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={isViewing || isDownloading}
            onClick={() => void downloadPdf()}
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            {isDownloading ? "Generating…" : "Download company statement"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-500">
          Finalised totals use locked statements ({summary.finalised.finalisedPropertyCount} of{" "}
          {summary.totalProperties} properties). Preview includes all properties with current
          figures (draft and not-started included).
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricBlock
            label="Owner payouts"
            finalised={formatMoneyZar(summary.finalised.ownerPayouts)}
            preview={formatMoneyZar(summary.preview.ownerPayouts)}
            hint={`${summary.finalised.finalisedPropertyCount} finalised · ${summary.preview.propertiesWithFigures} with preview figures`}
          />
          <MetricBlock
            label="Management fees"
            finalised={formatMoneyZar(summary.finalised.managementFees)}
            preview={formatMoneyZar(summary.preview.managementFees)}
          />
          <MetricBlock
            label="Additional expenses"
            finalised={formatMoneyZar(summary.finalised.additionalExpenses)}
            preview={formatMoneyZar(summary.preview.additionalExpenses)}
          />
          <MetricBlock
            label="Right Stay income (total)"
            finalised={formatMoneyZar(summary.finalised.rightStayIncome.total)}
            preview={formatMoneyZar(summary.preview.rightStayIncome.total)}
            hint="Commission + expense income"
          />
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
            Right Stay income breakdown (finalised)
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-600">Commission</dt>
              <dd className="font-medium tabular-nums">
                {formatMoneyZar(summary.finalised.rightStayIncome.commission)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-600">Cleaning fees</dt>
              <dd className="font-medium tabular-nums">
                {formatMoneyZar(summary.finalised.rightStayIncome.cleaning)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-600">Welcome pack</dt>
              <dd className="font-medium tabular-nums">
                {formatMoneyZar(summary.finalised.rightStayIncome.welcomePack)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-600">Mid-stay clean</dt>
              <dd className="font-medium tabular-nums">
                {formatMoneyZar(summary.finalised.rightStayIncome.midStayClean)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:col-span-2">
              <dt className="text-slate-600">Service fees (+10%)</dt>
              <dd className="font-medium tabular-nums">
                {formatMoneyZar(summary.finalised.rightStayIncome.serviceFees)}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900"
            onClick={() => setBreakdownOpen((o) => !o)}
          >
            Additional expenses by category
            {breakdownOpen ? (
              <ChevronUp className="size-4 shrink-0 text-slate-500" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-slate-500" />
            )}
          </button>
          {breakdownOpen ? (
            <div className="mt-2 overflow-x-auto rounded-b-lg border border-t-0 border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Finalised charged</TableHead>
                    <TableHead className="text-right">Preview charged</TableHead>
                    <TableHead className="text-right">RSA income (F)</TableHead>
                    <TableHead className="text-right">RSA income (P)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.expenseBreakdown.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(row.finalisedCharged)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(row.previewCharged)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(row.finalisedRsaIncome)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(row.previewRsaIncome)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </CardContent>

      {previewUrl ? (
        <PdfViewer
          signedUrl={previewUrl}
          fileName={companyPdfFilename}
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
    </Card>
  )
}
