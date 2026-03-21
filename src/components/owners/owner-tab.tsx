"use client"

import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useMemo, useState } from "react"
import { OwnerFormModal } from "@/components/owners/owner-form-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type OwnerData = {
  full_name: string
  phone: string
  email: string
  id_number: string | null
  bank_name: string | null
  account_number: string | null
  branch_code: string | null
  notes: string | null
}

type OwnerTabProps = {
  propertyId: string
  owner: OwnerData | null
  portalUserId: string | null
  canManagePortal: boolean
}

function formatField(value: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : "Not provided"
}

function maskAccountNumber(value: string | null, reveal: boolean) {
  if (!value) return "Not provided"
  if (reveal) return value

  const digits = value.trim()
  if (digits.length <= 4) return "****"
  return `****${digits.slice(-4)}`
}

export function OwnerTab({ propertyId, owner, portalUserId, canManagePortal }: OwnerTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAccountRevealed, setIsAccountRevealed] = useState(false)

  const contactRows = useMemo(
    () => [
      { label: "Full Name", value: owner?.full_name ?? null },
      { label: "Phone", value: owner?.phone ?? null },
      { label: "Email", value: owner?.email ?? null },
      { label: "ID Number", value: owner?.id_number ?? null },
    ],
    [owner]
  )

  return (
    <>
      {canManagePortal ? (
        <Card className="border-green-100 bg-green-50/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Owner portal</p>
              <p className="text-sm text-slate-600">
                {owner
                  ? portalUserId
                    ? "A login is linked — the owner can use /owner-portal."
                    : "No login linked yet — pick a user with the Owner role."
                  : "Add owner details first, then link their login here."}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0 bg-white">
              <Link href={`/dashboard/properties/${propertyId}/owner-portal`}>
                {portalUserId ? "Manage portal link" : "Link portal user"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!owner ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <p className="text-sm text-slate-600">No owner linked yet</p>
            <Button onClick={() => setIsModalOpen(true)}>Add Owner Details</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <CardTitle>Owner Details</CardTitle>
            <Button variant="outline" onClick={() => setIsModalOpen(true)}>
              Edit Owner
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {contactRows.map((row) => (
                <div key={row.label} className="space-y-1 rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</p>
                  <p className="text-sm text-slate-900">{formatField(row.value)}</p>
                </div>
              ))}
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Bank Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bank Name</p>
                  <p className="text-sm text-slate-900">{formatField(owner.bank_name)}</p>
                </div>
                <div className="space-y-1 rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch Code</p>
                  <p className="text-sm text-slate-900">{formatField(owner.branch_code)}</p>
                </div>
                <div className="space-y-1 rounded-lg border border-slate-200 p-3 md:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Account Number
                    </p>
                    {owner.account_number ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setIsAccountRevealed((current) => !current)}
                      >
                        {isAccountRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        <span className="sr-only">
                          {isAccountRevealed ? "Hide account number" : "Reveal account number"}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-900">
                    {maskAccountNumber(owner.account_number, isAccountRevealed)}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
              <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-900">
                {formatField(owner.notes)}
              </div>
            </section>
          </CardContent>
        </Card>
      )}

      <OwnerFormModal
        propertyId={propertyId}
        owner={owner}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}
