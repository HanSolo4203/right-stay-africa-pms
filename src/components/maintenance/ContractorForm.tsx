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
import { CONTRACTOR_TRADES } from "@/lib/maintenance/constants"
import type { ContractorDto } from "@/types/maintenance"

type ContractorFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractor?: ContractorDto | null
  onSaved: (contractor: ContractorDto) => void
}

export function ContractorForm({ open, onOpenChange, contractor, onSaved }: ContractorFormProps) {
  const isEdit = Boolean(contractor)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [trade, setTrade] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!open) return
    setName(contractor?.name ?? "")
    setTrade(contractor?.trade ?? "")
    setPhone(contractor?.phone ?? "")
    setEmail(contractor?.email ?? "")
    setCompany(contractor?.company ?? "")
    setNotes(contractor?.notes ?? "")
  }, [open, contractor])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name is required.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        trade: trade.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        company: company.trim() || null,
        notes: notes.trim() || null,
      }
      const res = await fetch(
        isEdit ? `/api/contractors/${contractor!.id}` : "/api/contractors",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = (await res.json()) as { contractor?: ContractorDto; error?: string }
      if (!res.ok || !data.contractor) {
        toast.error(data.error ?? "Failed to save contractor.")
        return
      }
      toast.success(isEdit ? "Contractor updated." : "Contractor added.")
      onSaved(data.contractor)
      onOpenChange(false)
    } catch {
      toast.error("Failed to save contractor.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit contractor" : "Add contractor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractor-name">Name *</Label>
            <Input id="contractor-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Trade</Label>
            <Select value={trade || "none"} onValueChange={(v) => setTrade(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select trade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {CONTRACTOR_TRADES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contractor-phone">Phone</Label>
              <Input id="contractor-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor-email">Email</Label>
              <Input
                id="contractor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractor-company">Company</Label>
            <Input
              id="contractor-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractor-notes">Notes</Label>
            <Textarea
              id="contractor-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
