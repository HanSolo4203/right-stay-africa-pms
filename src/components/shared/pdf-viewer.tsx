"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type PdfViewerProps = {
  signedUrl: string
  fileName: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function PdfViewer({
  signedUrl,
  fileName,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: PdfViewerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            View PDF
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="truncate">{fileName}</DialogTitle>
          <DialogDescription className="sr-only">Secure PDF preview dialog</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-b px-4 py-2">
          <p className="text-sm text-muted-foreground">Secure PDF preview</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(signedUrl, "_blank", "noopener,noreferrer")}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>

        <div className="h-[70vh] bg-muted/40">
          <iframe
            title={fileName}
            src={signedUrl}
            className="h-full w-full"
            loading="lazy"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
