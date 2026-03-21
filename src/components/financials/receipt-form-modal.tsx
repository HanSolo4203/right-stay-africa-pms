"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createReceipt,
  updateReceipt,
} from "@/app/(dashboard)/properties/[id]/receipts/actions"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { type ReceiptActionInput, type ReceiptCategoryValue, type ReceiptFormItem } from "@/lib/types/receipt"

const RECEIPTS_BUCKET = "documents"

export const RECEIPT_CATEGORY_OPTIONS: Array<{ value: ReceiptCategoryValue; label: string }> = [
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "RATES_TAXES", label: "Rates & Taxes" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "OTHER", label: "Other" },
]

type ReceiptFormModalProps = {
  propertyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt?: ReceiptFormItem
}

const todayIso = new Date().toISOString().split("T")[0] ?? ""

export function ReceiptFormModal({ propertyId, open, onOpenChange, receipt }: ReceiptFormModalProps) {
  const router = useRouter()
  const [isSaving, startSaveTransition] = useTransition()

  const [date, setDate] = useState(todayIso)
  const [supplier, setSupplier] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<ReceiptCategoryValue>("OTHER")
  const [notes, setNotes] = useState("")
  const [filePaths, setFilePaths] = useState<string[]>([])

  const isEdit = Boolean(receipt)
  const selectedPath = filePaths[0] ?? receipt?.file_url ?? ""
  const selectedFileName = useMemo(() => {
    if (filePaths[0]) {
      return filePaths[0].split("/").pop() ?? ""
    }
    return receipt?.file_name ?? ""
  }, [filePaths, receipt?.file_name])

  useEffect(() => {
    if (!open) return
    setDate(receipt?.date ?? todayIso)
    setSupplier(receipt?.supplier ?? "")
    setAmount(receipt?.amount ?? "")
    setCategory(receipt?.category ?? "OTHER")
    setNotes(receipt?.notes ?? "")
    setFilePaths([])
  }, [open, receipt])

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setFilePaths([])
    }
  }

  const onSubmit = () => {
    const trimmedSupplier = supplier.trim()
    const parsedAmount = Number(amount)

    if (!trimmedSupplier) {
      toast.error("Supplier is required.")
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Amount must be greater than 0.")
      return
    }

    const payload: ReceiptActionInput = {
      date,
      supplier: trimmedSupplier,
      amount: parsedAmount,
      category,
      notes,
      file_url: selectedPath || null,
      file_name: selectedFileName || null,
    }

    startSaveTransition(async () => {
      try {
        if (receipt) {
          await updateReceipt(receipt.id, payload)
        } else {
          await createReceipt(propertyId, payload, selectedPath || undefined, selectedFileName || undefined)
        }
        handleOpenChange(false)
        router.refresh()
        toast.success(receipt ? "Receipt updated" : "Receipt saved")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save receipt."
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Receipt" : "Add Receipt"}</DialogTitle>
          <DialogDescription>
            Save receipt details and optionally upload the related receipt file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="receipt-date">Date</Label>
              <Input id="receipt-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-amount">Amount (ZAR)</Label>
              <Input
                id="receipt-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1234.50"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-supplier">Supplier</Label>
            <Input
              id="receipt-supplier"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder="Supplier name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-category">Category</Label>
            <Select value={category} onValueChange={(next) => setCategory(next as ReceiptCategoryValue)}>
              <SelectTrigger id="receipt-category" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {RECEIPT_CATEGORY_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-notes">Notes (optional)</Label>
            <Textarea
              id="receipt-notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add optional notes"
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt file (optional)</Label>
            <FileUploader
              bucket={RECEIPTS_BUCKET}
              storagePath={`properties/${propertyId}/receipts`}
              accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "application/pdf": [".pdf"] }}
              maxFiles={1}
              maxSizeMB={10}
              label="Upload receipt (JPG, PNG or PDF)"
              onUploadComplete={setFilePaths}
            />
            {isEdit && receipt?.file_name && !filePaths[0] ? (
              <p className="text-xs text-muted-foreground">Current file: {receipt.file_name}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
