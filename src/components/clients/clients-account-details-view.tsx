"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { z } from "zod"
import { ClientListPanel } from "@/components/clients/client-list-panel"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { accountTypeSchema } from "@/lib/validations/client-profile"

const profileSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Valid email is required."),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
})

const bankingSchema = z.object({
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  accountNumber: z.string().optional(),
  branchCode: z.string().optional(),
  accountType: accountTypeSchema.optional().nullable(),
})

type ProfileValues = z.infer<typeof profileSchema>
type BankingValues = z.infer<typeof bankingSchema>

type ClientDetail = {
  id: string
  name: string
  email: string
  phone: string | null
  status: "ACTIVE" | "ARCHIVED"
  bankName: string | null
  accountHolder: string | null
  accountNumber: string | null
  branchCode: string | null
  accountType: string | null
  properties: Array<{
    id: string
    name: string
    managementFeeRate: number | null
    managementFeeType: string
  }>
}

export function ClientsAccountDetailsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedClientId = searchParams.get("client")
  const [loading, setLoading] = useState(false)
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBanking, setSavingBanking] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "", phone: "", status: "ACTIVE" },
  })

  const bankingForm = useForm<BankingValues>({
    resolver: zodResolver(bankingSchema),
    defaultValues: {
      bankName: "",
      accountHolder: "",
      accountNumber: "",
      branchCode: "",
      accountType: null,
    },
  })

  const load = useCallback(async () => {
    if (!selectedClientId || selectedClientId.startsWith("property:")) {
      setClient(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${selectedClientId}`)
      const json = (await res.json()) as { client?: ClientDetail; error?: string }
      if (!res.ok || !json.client) {
        toast.error(json.error ?? "Failed to load client.")
        return
      }
      setClient(json.client)
      profileForm.reset({
        name: json.client.name,
        email: json.client.email,
        phone: json.client.phone ?? "",
        status: json.client.status,
      })
      bankingForm.reset({
        bankName: json.client.bankName ?? "",
        accountHolder: json.client.accountHolder ?? "",
        accountNumber: json.client.accountNumber ?? "",
        branchCode: json.client.branchCode ?? "",
        accountType: (json.client.accountType as BankingValues["accountType"]) ?? null,
      })
    } catch {
      toast.error("Failed to load client.")
    } finally {
      setLoading(false)
    }
  }, [selectedClientId, profileForm, bankingForm])

  useEffect(() => {
    void load()
  }, [load])

  const selectClient = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("client", id)
    router.replace(`/clients/account-details?${params.toString()}`)
  }

  const saveProfile = async (values: ProfileValues) => {
    if (!client) return
    setSavingProfile(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          phone: values.phone || null,
          bankName: bankingForm.getValues("bankName") || null,
          accountHolder: bankingForm.getValues("accountHolder") || null,
          accountNumber: bankingForm.getValues("accountNumber") || null,
          branchCode: bankingForm.getValues("branchCode") || null,
          accountType: bankingForm.getValues("accountType") ?? null,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save profile.")
        return
      }
      toast.success("Profile saved.")
      await load()
    } catch {
      toast.error("Failed to save profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const saveBanking = async (values: BankingValues) => {
    if (!client) return
    setSavingBanking(true)
    try {
      const profile = profileForm.getValues()
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone || null,
          status: profile.status,
          bankName: values.bankName || null,
          accountHolder: values.accountHolder || null,
          accountNumber: values.accountNumber || null,
          branchCode: values.branchCode || null,
          accountType: values.accountType ?? null,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save banking details.")
        return
      }
      toast.success("Banking details saved.")
      await load()
    } catch {
      toast.error("Failed to save banking details.")
    } finally {
      setSavingBanking(false)
    }
  }

  return (
    <div className="flex min-h-[600px] gap-4 rounded-xl bg-[#f0f4f8] p-4">
      <ClientListPanel selectedClientId={selectedClientId} onSelect={selectClient} />
      <div className="min-w-0 flex-1">
        {!selectedClientId || selectedClientId.startsWith("property:") ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              {selectedClientId?.startsWith("property:")
                ? "Unassigned properties have no client account. Assign a client first."
                : "Select a client to view and edit account details."}
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : client ? (
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Client Profile</h2>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(saveProfile)} className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      className="bg-emerald-700 hover:bg-emerald-800"
                      disabled={savingProfile}
                    >
                      {savingProfile ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save changes
                    </Button>
                  </div>
                </form>
              </Form>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-6">
              <h2 className="text-xl font-semibold text-slate-900">Banking Details</h2>
              <p className="text-sm text-slate-500">
                Banking details are stored securely and used for generating payout references on owner
                statements.
              </p>
              <Form {...bankingForm}>
                <form
                  onSubmit={bankingForm.handleSubmit(saveBanking)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <FormField
                    control={bankingForm.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bankingForm.control}
                    name="accountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account holder name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bankingForm.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bankingForm.control}
                    name="branchCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bankingForm.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account type</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) =>
                            field.onChange(v === "" ? null : (v as BankingValues["accountType"]))
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="transmission">Transmission</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="outline" disabled={savingBanking}>
                      {savingBanking ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save banking details
                    </Button>
                  </div>
                </form>
              </Form>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-xl font-semibold text-slate-900">Assigned Properties</h2>
              {client.properties.length === 0 ? (
                <p className="text-sm text-slate-500">No properties assigned.</p>
              ) : (
                <ul className="space-y-2">
                  {client.properties.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          Management fee:{" "}
                          {p.managementFeeRate != null
                            ? p.managementFeeType === "percentage"
                              ? `${p.managementFeeRate}%`
                              : `R ${p.managementFeeRate}`
                            : "Not set"}
                        </p>
                      </div>
                      <Link
                        href={`/clients/statements?client=${client.id}`}
                        className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        View statements →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
