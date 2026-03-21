"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadStatement } from "@/app/(dashboard)/properties/[id]/statements/actions"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"

type UploadStatementModalProps = {
  propertyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MONTHS = [
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

const STATEMENTS_BUCKET = "documents"

export function UploadStatementModal({ propertyId, open, onOpenChange }: UploadStatementModalProps) {
  const router = useRouter()
  const [isUploading, startUploadTransition] = useTransition()
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - i), [currentYear])

  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(currentYear))
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  const selectedPath = filePaths[0] ?? ""
  const selectedFileName = selectedPath.split("/").pop() ?? ""

  const resetForm = () => {
    setMonth(String(new Date().getMonth() + 1))
    setYear(String(currentYear))
    setFilePaths([])
    setNotes("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const onSubmit = () => {
    if (!selectedPath || !selectedFileName) {
      toast.error("Please upload a statement PDF first.")
      return
    }

    startUploadTransition(async () => {
      try {
        await uploadStatement(
          propertyId,
          Number(month),
          Number(year),
          selectedPath,
          selectedFileName,
          notes
        )
        handleOpenChange(false)
        router.refresh()
        toast.success("Statement uploaded")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload statement."
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Statement</DialogTitle>
          <DialogDescription>
            Upload a monthly owner statement PDF and save metadata to this property.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="statement-month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="statement-month" className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((item) => (
                    <SelectItem key={item.value} value={String(item.value)}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statement-year">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="statement-year" className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((item) => (
                    <SelectItem key={item} value={String(item)}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Statement PDF</Label>
            <FileUploader
              bucket={STATEMENTS_BUCKET}
              storagePath={`properties/${propertyId}/statements`}
              accept={{ "application/pdf": [".pdf"] }}
              maxFiles={1}
              maxSizeMB={20}
              label="Upload statement PDF"
              onUploadComplete={setFilePaths}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="statement-notes">Notes (optional)</Label>
            <Textarea
              id="statement-notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add optional notes"
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
