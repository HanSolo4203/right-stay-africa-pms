"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MaintenanceJobDto } from "@/types/maintenance"

type CompletePayload = {
  actualCost?: number
  chargeToOwner: boolean
  ownerStatementNote?: string
}

type JobStatusActionsProps = {
  job: MaintenanceJobDto
  saving?: boolean
  onStatusChange: (status: string, complete?: CompletePayload) => void
}

export function JobStatusActions({ job, saving, onStatusChange }: JobStatusActionsProps) {
  const [completeOpen, setCompleteOpen] = useState(false)
  const [actualCost, setActualCost] = useState(
    job.actualCost?.toString() ?? job.estimatedCost?.toString() ?? ""
  )
  const [chargeToOwner, setChargeToOwner] = useState(job.chargeToOwner)
  const [statementNote, setStatementNote] = useState(job.ownerStatementNote ?? job.title)

  const confirmComplete = () => {
    const cost = actualCost.trim() ? Number(actualCost) : undefined
    onStatusChange("completed", {
      actualCost: cost,
      chargeToOwner,
      ownerStatementNote: chargeToOwner ? statementNote : undefined,
    })
    setCompleteOpen(false)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 border-t border-[var(--spike-glass-border)] pt-4">
        {job.status === "open" ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => onStatusChange("in_progress")}
            >
              Mark in progress
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onStatusChange("cancelled")}
            >
              Cancel job
            </Button>
          </>
        ) : null}

        {job.status === "in_progress" ? (
          <>
            <Button type="button" size="sm" disabled={saving} onClick={() => setCompleteOpen(true)}>
              Mark completed
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onStatusChange("open")}
            >
              Back to open
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onStatusChange("cancelled")}
            >
              Cancel job
            </Button>
          </>
        ) : null}

        {job.status === "open" ? (
          <Button type="button" size="sm" disabled={saving} onClick={() => setCompleteOpen(true)}>
            Mark completed
          </Button>
        ) : null}

        {job.status === "completed" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => onStatusChange("open")}
          >
            Reopen
          </Button>
        ) : null}
      </div>

      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete job</AlertDialogTitle>
            <AlertDialogDescription>
              Record the final cost and optionally add it to the owner statement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="complete-cost">Actual cost (ZAR)</Label>
              <Input
                id="complete-cost"
                type="number"
                min={0}
                step="0.01"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="charge-owner"
                type="checkbox"
                checked={chargeToOwner}
                onChange={(e) => setChargeToOwner(e.target.checked)}
                className="size-4 rounded border-[var(--spike-glass-border)]"
              />
              <Label htmlFor="charge-owner">Charge to owner statement?</Label>
            </div>
            {chargeToOwner ? (
              <div className="space-y-2">
                <Label htmlFor="statement-note">Description for statement</Label>
                <Input
                  id="statement-note"
                  value={statementNote}
                  onChange={(e) => setStatementNote(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete} disabled={saving}>
              Confirm completion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
