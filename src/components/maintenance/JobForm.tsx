"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { CATEGORY_LABELS } from "@/lib/maintenance/constants"
import {
  MAINTENANCE_JOB_CATEGORIES,
  MAINTENANCE_JOB_PRIORITIES,
} from "@/lib/validations/maintenance"
import type { ContractorDto, MaintenanceJobDto, PropertyOption } from "@/types/maintenance"

type ContractorMode = "directory" | "manual"

type JobFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job?: MaintenanceJobDto | null
  properties: PropertyOption[]
  contractors: ContractorDto[]
  defaultPropertyId?: string
  onSaved: (job: MaintenanceJobDto) => void
  onContractorCreated?: (contractor: ContractorDto) => void
}

export function JobForm({
  open,
  onOpenChange,
  job,
  properties,
  contractors,
  defaultPropertyId,
  onSaved,
  onContractorCreated,
}: JobFormProps) {
  const isEdit = Boolean(job)
  const [saving, setSaving] = useState(false)
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "")
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<string>("general")
  const [priority, setPriority] = useState<string>("medium")
  const [description, setDescription] = useState("")
  const [contractorMode, setContractorMode] = useState<ContractorMode>("directory")
  const [contractorId, setContractorId] = useState("")
  const [contractorName, setContractorName] = useState("")
  const [contractorPhone, setContractorPhone] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [dueBy, setDueBy] = useState("")
  const [estimatedCost, setEstimatedCost] = useState("")
  const [chargeToOwner, setChargeToOwner] = useState(false)
  const [ownerStatementNote, setOwnerStatementNote] = useState("")
  const [notes, setNotes] = useState("")
  const [showNewContractor, setShowNewContractor] = useState(false)
  const [newContractorName, setNewContractorName] = useState("")
  const [newContractorTrade, setNewContractorTrade] = useState("")

  useEffect(() => {
    if (!open) return
    setPropertyId(job?.propertyId ?? defaultPropertyId ?? properties[0]?.id ?? "")
    setTitle(job?.title ?? "")
    setCategory(job?.category ?? "general")
    setPriority(job?.priority ?? "medium")
    setDescription(job?.description ?? "")
    if (job?.contractorId) {
      setContractorMode("directory")
      setContractorId(job.contractorId)
    } else if (job?.contractorName) {
      setContractorMode("manual")
      setContractorName(job.contractorName)
      setContractorPhone(job.contractorPhone ?? "")
    } else {
      setContractorMode("directory")
      setContractorId("")
    }
    setScheduledFor(job?.scheduledFor ? job.scheduledFor.slice(0, 10) : "")
    setDueBy(job?.dueBy ? job.dueBy.slice(0, 10) : "")
    setEstimatedCost(job?.estimatedCost?.toString() ?? "")
    setChargeToOwner(job?.chargeToOwner ?? false)
    setOwnerStatementNote(job?.ownerStatementNote ?? job?.title ?? "")
    setNotes("")
    setShowNewContractor(false)
  }, [open, job, defaultPropertyId, properties])

  useEffect(() => {
    if (!chargeToOwner && title) setOwnerStatementNote(title)
  }, [title, chargeToOwner])

  const saveNewContractor = async () => {
    if (!newContractorName.trim()) {
      toast.error("Contractor name is required.")
      return
    }
    const res = await fetch("/api/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newContractorName, trade: newContractorTrade || null }),
    })
    const data = (await res.json()) as { contractor?: ContractorDto; error?: string }
    if (!res.ok || !data.contractor) {
      toast.error(data.error ?? "Failed to add contractor.")
      return
    }
    onContractorCreated?.(data.contractor)
    setContractorId(data.contractor.id)
    setShowNewContractor(false)
    setNewContractorName("")
    setNewContractorTrade("")
    toast.success("Contractor added.")
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propertyId) {
      toast.error("Property is required.")
      return
    }
    if (!title.trim()) {
      toast.error("Title is required.")
      return
    }
    if (title.length > 100) {
      toast.error("Title must be 100 characters or less.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        propertyId,
        title: title.trim(),
        category,
        priority,
        description: description.trim() || null,
        contractorId: contractorMode === "directory" && contractorId ? contractorId : null,
        contractorName: contractorMode === "manual" ? contractorName.trim() || null : null,
        contractorPhone: contractorMode === "manual" ? contractorPhone.trim() || null : null,
        scheduledFor: scheduledFor || null,
        dueBy: dueBy || null,
        estimatedCost: estimatedCost.trim() ? Number(estimatedCost) : null,
        chargeToOwner,
        ownerStatementNote: chargeToOwner ? ownerStatementNote.trim() || title.trim() : null,
        notes: notes.trim() || null,
      }

      const res = await fetch(isEdit ? `/api/maintenance/${job!.id}` : "/api/maintenance", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { job?: MaintenanceJobDto; error?: string }
      if (!res.ok || !data.job) {
        toast.error(data.error ?? "Failed to save job.")
        return
      }
      toast.success(isEdit ? "Job updated." : "Job created successfully")
      onSaved(data.job)
      onOpenChange(false)
    } catch {
      toast.error("Failed to save job.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit job" : "New job"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Property *</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.unitNumber ? ` · ${p.unitNumber}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-title">Title *</Label>
            <Input
              id="job-title"
              value={title}
              maxLength={100}
              placeholder="e.g. Fix leaking tap in main bathroom"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_JOB_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_JOB_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-desc">Description</Label>
            <Textarea
              id="job-desc"
              rows={3}
              placeholder="Additional details about the job..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Contractor</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={contractorMode === "directory" ? "default" : "outline"}
                onClick={() => setContractorMode("directory")}
              >
                From directory
              </Button>
              <Button
                type="button"
                size="sm"
                variant={contractorMode === "manual" ? "default" : "outline"}
                onClick={() => setContractorMode("manual")}
              >
                Enter manually
              </Button>
            </div>
            {contractorMode === "directory" ? (
              <div className="space-y-2">
                <Select value={contractorId || "none"} onValueChange={(v) => {
                  if (v === "add-new") setShowNewContractor(true)
                  else setContractorId(v === "none" ? "" : v)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.trade ? ` · ${c.trade}` : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new">+ Add new contractor</SelectItem>
                  </SelectContent>
                </Select>
                {showNewContractor ? (
                  <div className="rounded-lg border border-[var(--spike-glass-border)] p-3 space-y-2">
                    <Input
                      placeholder="Contractor name"
                      value={newContractorName}
                      onChange={(e) => setNewContractorName(e.target.value)}
                    />
                    <Input
                      placeholder="Trade (optional)"
                      value={newContractorTrade}
                      onChange={(e) => setNewContractorTrade(e.target.value)}
                    />
                    <Button type="button" size="sm" onClick={() => void saveNewContractor()}>
                      Save contractor
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Name"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={contractorPhone}
                  onChange={(e) => setContractorPhone(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduled-for">Scheduled for</Label>
              <Input
                id="scheduled-for"
                type="date"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-by">Due by</Label>
              <Input id="due-by" type="date" value={dueBy} onChange={(e) => setDueBy(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-cost">Estimated cost (ZAR)</Label>
            <Input
              id="estimated-cost"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="charge-to-owner"
                type="checkbox"
                checked={chargeToOwner}
                onChange={(e) => setChargeToOwner(e.target.checked)}
                className="size-4 rounded border-[var(--spike-glass-border)]"
              />
              <Label htmlFor="charge-to-owner">Add cost to owner statement when completed</Label>
            </div>
            {chargeToOwner ? (
              <Input
                placeholder="Description for statement"
                value={ownerStatementNote}
                onChange={(e) => setOwnerStatementNote(e.target.value)}
              />
            ) : null}
          </div>

          {!isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="job-notes">Notes</Label>
              <Textarea
                id="job-notes"
                rows={2}
                placeholder="Internal notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
