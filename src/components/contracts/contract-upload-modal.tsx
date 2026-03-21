"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadContract } from "@/app/(dashboard)/properties/[id]/contract/actions"
import { FileUploader } from "@/components/shared/file-uploader"
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
import { toast } from "@/components/ui/toast"

type ContractUploadModalProps = {
  propertyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CONTRACTS_BUCKET = "documents"

export function ContractUploadModal({ propertyId, open, onOpenChange }: ContractUploadModalProps) {
  const router = useRouter()
  const [isUploading, startUploadTransition] = useTransition()
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [noEndDate, setNoEndDate] = useState(false)
  const [commissionRate, setCommissionRate] = useState("")

  useEffect(() => {
    if (noEndDate) {
      setEndDate("")
    }
  }, [noEndDate])

  const resetForm = () => {
    setFilePaths([])
    setStartDate("")
    setEndDate("")
    setNoEndDate(false)
    setCommissionRate("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const selectedPath = filePaths[0] ?? ""
  const selectedFileName = selectedPath.split("/").pop() ?? ""

  const onSubmit = () => {
    if (!selectedPath || !selectedFileName) {
      toast.error("Please upload a contract PDF first.")
      return
    }

    if (!startDate) {
      toast.error("Please select a start date.")
      return
    }

    if (!noEndDate && !endDate) {
      toast.error("Please select an end date or choose no end date.")
      return
    }

    if (!commissionRate.trim()) {
      toast.error("Please enter a commission rate.")
      return
    }

    startUploadTransition(async () => {
      try {
        await uploadContract(
          propertyId,
          {
            startDate,
            endDate: noEndDate ? null : endDate,
            commissionRate,
          },
          selectedPath,
          selectedFileName
        )
        handleOpenChange(false)
        router.refresh()
        toast.success("Contract uploaded")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload contract."
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Contract</DialogTitle>
          <DialogDescription>Upload a signed PDF contract and capture its key terms.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contract PDF</Label>
            <FileUploader
              bucket={CONTRACTS_BUCKET}
              storagePath={`properties/${propertyId}/contracts`}
              accept={{ "application/pdf": [".pdf"] }}
              maxFiles={1}
              maxSizeMB={20}
              label="Upload contract PDF"
              onUploadComplete={setFilePaths}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contract-start-date">Start Date</Label>
              <Input
                id="contract-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-end-date">End Date</Label>
              <Input
                id="contract-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={noEndDate}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={noEndDate}
                  onChange={(event) => setNoEndDate(event.target.checked)}
                />
                No end date
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission-rate">Commission Rate</Label>
            <Input
              id="commission-rate"
              placeholder="e.g. 15% or R3500/month"
              value={commissionRate}
              onChange={(event) => setCommissionRate(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isUploading || !selectedPath}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
