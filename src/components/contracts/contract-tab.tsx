"use client"

import { useMemo, useState, useTransition } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle } from "lucide-react"
import { ContractUploadModal } from "@/components/contracts/contract-upload-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"

type ContractItem = {
  id: string
  file_name: string
  file_url: string
  start_date: string
  end_date: string | null
  commission_rate: string
  version: number
  created_at: string
}

type ContractTabProps = {
  propertyId: string
  contracts: ContractItem[]
}

const CONTRACTS_BUCKET = "documents"
const PdfViewer = dynamic(
  () => import("@/components/shared/pdf-viewer").then((module) => module.PdfViewer),
  { ssr: false, loading: () => null }
)

function formatDate(value: string | null) {
  if (!value) return "No end date"
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function getExpiryWarning(endDate: string | null) {
  if (!endDate) return null

  const now = new Date()
  const end = new Date(endDate)
  const msDiff = end.getTime() - now.getTime()
  const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24))

  if (days < 0) {
    return { tone: "red" as const, text: "Contract has expired." }
  }

  if (days <= 30) {
    return { tone: "amber" as const, text: `Contract expires in ${days} day${days === 1 ? "" : "s"}.` }
  }

  return null
}

export function ContractTab({ propertyId, contracts }: ContractTabProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isFetchingSignedUrl, startSignedUrlTransition] = useTransition()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSignedUrl, setViewerSignedUrl] = useState("")
  const [viewerFileName, setViewerFileName] = useState("")

  const currentContract = contracts[0] ?? null
  const previousContracts = useMemo(() => contracts.slice(1), [contracts])
  const warning = getExpiryWarning(currentContract?.end_date ?? null)

  const getSignedUrl = async (path: string) => {
    const response = await fetch(
      `/api/storage/signed-url?bucket=${encodeURIComponent(CONTRACTS_BUCKET)}&path=${encodeURIComponent(path)}`
    )
    const payload = (await response.json()) as { signedUrl?: string; error?: string }
    if (!response.ok || !payload.signedUrl) {
      throw new Error(payload.error ?? "Failed to get signed URL.")
    }
    return payload.signedUrl
  }

  const onView = (path: string, name: string) => {
    startSignedUrlTransition(async () => {
      try {
        const signedUrl = await getSignedUrl(path)
        setViewerSignedUrl(signedUrl)
        setViewerFileName(name)
        setViewerOpen(true)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open contract."
        toast.error(message)
      }
    })
  }

  const onDownload = (path: string) => {
    startSignedUrlTransition(async () => {
      try {
        const signedUrl = await getSignedUrl(path)
        window.open(signedUrl, "_blank", "noopener,noreferrer")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to download contract."
        toast.error(message)
      }
    })
  }

  return (
    <>
      {!currentContract ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <p className="text-sm text-slate-600">No contract uploaded</p>
            <Button onClick={() => setIsUploadOpen(true)}>Upload Contract</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <CardTitle>Current Contract</CardTitle>
            <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
              Upload New Version
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {warning ? (
              <div
                className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                  warning.tone === "red"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-amber-300 bg-amber-50 text-amber-800"
                }`}
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{warning.text}</span>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">File Name</p>
                <p className="text-sm text-slate-900">{currentContract.file_name}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Upload Date</p>
                <p className="text-sm text-slate-900">{formatDate(currentContract.created_at)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</p>
                <p className="text-sm text-slate-900">{formatDate(currentContract.start_date)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">End Date</p>
                <p className="text-sm text-slate-900">{formatDate(currentContract.end_date)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Commission Rate</p>
                <p className="text-sm text-slate-900">{currentContract.commission_rate}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Version</p>
                <p className="text-sm text-slate-900">Version {currentContract.version}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onView(currentContract.file_url, currentContract.file_name)}
                disabled={isFetchingSignedUrl}
              >
                View Contract
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDownload(currentContract.file_url)}
                disabled={isFetchingSignedUrl}
              >
                Download
              </Button>
            </div>

            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Previous Versions ({previousContracts.length})
              </summary>
              {previousContracts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No previous versions</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {previousContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{contract.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Version {contract.version} · Uploaded {formatDate(contract.created_at)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onDownload(contract.file_url)}
                        disabled={isFetchingSignedUrl}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </details>
          </CardContent>
        </Card>
      )}

      <ContractUploadModal propertyId={propertyId} open={isUploadOpen} onOpenChange={setIsUploadOpen} />

      {viewerSignedUrl ? (
        <PdfViewer
          signedUrl={viewerSignedUrl}
          fileName={viewerFileName}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          hideTrigger
        />
      ) : null}
    </>
  )
}
