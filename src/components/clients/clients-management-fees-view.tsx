"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { z } from "zod"
import { ClientListPanel } from "@/components/clients/client-list-panel"
import { ClientsMonthToolbar } from "@/components/clients/clients-month-toolbar"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ManagementFeeType } from "@/lib/clients/management-fee-calculator"

const feeTypeLabels: Record<ManagementFeeType, string> = {
  percentage: "Percentage of gross (%)",
  fixed_monthly: "Fixed amount per month (R)",
  fixed_per_booking: "Fixed amount per booking (R)",
}

type ManagementFeeConfig = {
  propertyId: string
  propertyName: string
  feeType: ManagementFeeType
  rate: number
  welcomePackFee: number
}

type ManagementFeeSummaryRow = {
  propertyId: string
  propertyName: string
  grossRevenue: number
  feeType: ManagementFeeType
  rate: number
  feeEarned: number
}

type FeesResponse = {
  configs: ManagementFeeConfig[]
  summary: ManagementFeeSummaryRow[]
  totalFeesEarned: number
  error?: string
}

const rowSchema = z.object({
  feeType: z.enum(["percentage", "fixed_monthly", "fixed_per_booking"]),
  rate: z.number().min(0, "Rate cannot be negative."),
  welcomePackFee: z.number().min(0, "Welcome pack fee cannot be negative."),
})

type RowValues = z.infer<typeof rowSchema>

function FeeConfigRow({
  config,
  onSaved,
}: {
  config: ManagementFeeConfig
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const form = useForm<RowValues>({
    resolver: zodResolver(rowSchema),
    defaultValues: {
      feeType: config.feeType,
      rate: config.rate || 0,
      welcomePackFee: config.welcomePackFee || 0,
    },
  })

  useEffect(() => {
    form.reset({
      feeType: config.feeType,
      rate: config.rate || 0,
      welcomePackFee: config.welcomePackFee || 0,
    })
  }, [config, form])

  const save = async (values: RowValues) => {
    setSaving(true)
    try {
      const res = await fetch("/api/clients/management-fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: config.propertyId,
          feeType: values.feeType,
          rate: values.rate,
          welcomePackFee: values.welcomePackFee,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save.")
        return
      }
      toast.success(`Saved ${config.propertyName}.`)
      onSaved()
    } catch {
      toast.error("Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(save)}
        className="grid grid-cols-1 items-end gap-3 border-b border-slate-100 py-3 sm:grid-cols-[1fr_160px_100px_120px_auto]"
      >
        <div className="font-medium text-slate-800">{config.propertyName}</div>
        <FormField
          control={form.control}
          name="feeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Fee type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(feeTypeLabels) as ManagementFeeType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {feeTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Rate</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="welcomePackFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Welcome pack (R per booking)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Welcome pack R"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" variant="outline" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </form>
    </Form>
  )
}

export function ClientsManagementFeesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FeesResponse | null>(null)
  const [clientLabel, setClientLabel] = useState<{ name: string; email: string } | null>(null)
  const selectedClientId = searchParams.get("client")

  const load = useCallback(async () => {
    if (!selectedClientId) {
      setData(null)
      setClientLabel(null)
      return
    }
    setLoading(true)
    try {
      if (!selectedClientId.startsWith("property:")) {
        const clientRes = await fetch(`/api/clients/${selectedClientId}`)
        const clientJson = (await clientRes.json()) as {
          client?: { name: string; email: string }
        }
        if (clientRes.ok && clientJson.client) {
          setClientLabel({ name: clientJson.client.name, email: clientJson.client.email })
        }
      } else {
        setClientLabel({ name: "Unassigned property", email: "" })
      }
      const res = await fetch(
        `/api/clients/management-fees?clientId=${encodeURIComponent(selectedClientId)}&month=${month}&year=${year}`
      )
      const json = (await res.json()) as FeesResponse
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load management fees.")
        return
      }
      setData(json)
    } catch {
      toast.error("Failed to load management fees.")
    } finally {
      setLoading(false)
    }
  }, [selectedClientId, month, year])

  useEffect(() => {
    void load()
  }, [load])

  const selectClient = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("client", id)
    router.replace(`/clients/management-fees?${params.toString()}`)
  }

  return (
    <div className="flex min-h-[600px] gap-4 rounded-xl bg-[#f0f4f8] p-4">
      <ClientListPanel selectedClientId={selectedClientId} onSelect={selectClient} />
      <div className="min-w-0 flex-1 space-y-4">
        <ClientsMonthToolbar
          month={month}
          year={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
        {!selectedClientId ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Select a client to configure management fees.</p>
          </div>
        ) : loading ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {clientLabel ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{clientLabel.name}</h2>
                {clientLabel.email ? (
                  <p className="text-sm text-slate-500">{clientLabel.email}</p>
                ) : null}
              </div>
            ) : null}
            <div>
              <h3 className="text-base font-semibold text-slate-900">Management Fee Settings</h3>
              <p className="text-sm text-slate-500">
                Configure fee type, rate, and welcome pack fee per property (same values as property
                edit → Statement settings). Summary uses booking data for the selected month.
              </p>
            </div>
            {data?.configs.length === 0 ? (
              <p className="text-sm text-slate-500">No properties for this client.</p>
            ) : (
              <div className="space-y-1">
                <div className="hidden text-xs font-medium text-slate-500 sm:grid sm:grid-cols-[1fr_160px_100px_120px_auto] sm:gap-3 sm:px-0 sm:pb-1">
                  <span>Property</span>
                  <span>Fee type</span>
                  <span>Rate</span>
                  <span>Welcome pack / booking</span>
                  <span />
                </div>
                {data?.configs.map((c) => (
                  <FeeConfigRow key={c.propertyId} config={c} onSaved={load} />
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900">Fee summary</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead className="text-right">Gross revenue</TableHead>
                      <TableHead>Fee type</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Fee earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.summary ?? []).map((row) => (
                      <TableRow key={row.propertyId}>
                        <TableCell>{row.propertyName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyZar(row.grossRevenue)}
                        </TableCell>
                        <TableCell>{feeTypeLabels[row.feeType]}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.feeType === "percentage" ? `${row.rate}%` : formatMoneyZar(row.rate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoneyZar(row.feeEarned)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-semibold">
                      <TableCell colSpan={4}>Total fees earned this month</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyZar(data?.totalFeesEarned ?? 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
