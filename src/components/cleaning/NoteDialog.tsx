"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type NoteDialogProps = {
  open: boolean
  noteText: string
  onNoteTextChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSave: () => Promise<void> | void
}

export function NoteDialog({ open, noteText, onNoteTextChange, onOpenChange, onSave }: NoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add cleaning note</DialogTitle>
        </DialogHeader>
        <Textarea
          value={noteText}
          onChange={(e) => onNoteTextChange(e.target.value)}
          placeholder="e.g. Extra attention needed in bathroom, guest had a pet..."
          rows={4}
          className="mt-2"
          maxLength={500}
        />
        <p className="text-xs text-gray-400 text-right mt-1">{noteText.length}/500</p>
        <DialogFooter className="mt-3" showCloseButton={false}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={async () => {
              await onSave()
              onOpenChange(false)
            }}
          >
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

