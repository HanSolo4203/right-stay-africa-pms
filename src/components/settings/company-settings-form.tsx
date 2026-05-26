"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Twitter,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useForm, type ControllerRenderProps } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  companySettingsFormSchema,
  type CompanySettingsFormValues,
} from "@/lib/validations/company-settings"
import { cn } from "@/lib/utils"

const defaultValues: CompanySettingsFormValues = {
  companyName: "Right Stay Africa",
  tagline: "",
  registrationNumber: "",
  vatNumber: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  website: "",
  instagramUrl: "",
  facebookUrl: "",
  linkedinUrl: "",
  twitterUrl: "",
  statementFooterNote: "",
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  branchCode: "",
  accountType: null,
}

type SettingsResponse = CompanySettingsFormValues & {
  id: string | null
  error?: string
  details?: unknown
}

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

type UrlFieldName = "website" | "instagramUrl" | "facebookUrl" | "linkedinUrl" | "twitterUrl"

function UrlFieldRow({
  icon: Icon,
  label,
  field,
  placeholder,
}: {
  icon: typeof Globe
  label: string
  field: ControllerRenderProps<CompanySettingsFormValues, UrlFieldName>
  placeholder: string
}) {
  const value = field.value ?? ""
  const showVisit = isValidHttpUrl(value)

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <FormControl>
            <Input type="url" placeholder={placeholder} {...field} value={value} />
          </FormControl>
          {showVisit ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Visit →
            </a>
          ) : null}
        </div>
      </div>
      <FormMessage />
    </FormItem>
  )
}

export function CompanySettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues,
  })

  const footerNote = form.watch("statementFooterNote")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings")
      const json = (await res.json()) as SettingsResponse & { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load settings.")
        return
      }
      form.reset({
        companyName: json.companyName ?? defaultValues.companyName,
        tagline: json.tagline ?? "",
        registrationNumber: json.registrationNumber ?? "",
        vatNumber: json.vatNumber ?? "",
        email: json.email ?? "",
        phone: json.phone ?? "",
        whatsapp: json.whatsapp ?? "",
        address: json.address ?? "",
        website: json.website ?? "",
        instagramUrl: json.instagramUrl ?? "",
        facebookUrl: json.facebookUrl ?? "",
        linkedinUrl: json.linkedinUrl ?? "",
        twitterUrl: json.twitterUrl ?? "",
        statementFooterNote: json.statementFooterNote ?? "",
        bankName: json.bankName ?? "",
        accountHolder: json.accountHolder ?? "",
        accountNumber: json.accountNumber ?? "",
        branchCode: json.branchCode ?? "",
        accountType: json.accountType ?? null,
      })
    } catch {
      toast.error("Failed to load settings.")
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    void load()
  }, [load])

  const onSubmit = async (values: CompanySettingsFormValues) => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          tagline: values.tagline || null,
          registrationNumber: values.registrationNumber || null,
          vatNumber: values.vatNumber || null,
          email: values.email || null,
          phone: values.phone || null,
          whatsapp: values.whatsapp || null,
          address: values.address || null,
          website: values.website || null,
          instagramUrl: values.instagramUrl || null,
          facebookUrl: values.facebookUrl || null,
          linkedinUrl: values.linkedinUrl || null,
          twitterUrl: values.twitterUrl || null,
          statementFooterNote: values.statementFooterNote || null,
          bankName: values.bankName || null,
          accountHolder: values.accountHolder || null,
          accountNumber: values.accountNumber || null,
          branchCode: values.branchCode || null,
          accountType: values.accountType ?? null,
        }),
      })
      const json = (await res.json()) as {
        error?: string
        details?: { fieldErrors?: Record<string, string[]> }
      }
      if (!res.ok) {
        const fieldErrors = json.details?.fieldErrors
        const firstFieldMessage =
          fieldErrors &&
          Object.values(fieldErrors)
            .flat()
            .find((message) => message.length > 0)
        toast.error(firstFieldMessage ?? json.error ?? "Failed to save settings.")
        return
      }
      toast.success("Settings saved.")
      await load()
    } catch {
      toast.error("Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Company Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Right Stay Africa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagline"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Tagline</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Premium Property Management" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2019/123456/07" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 4123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="info@rightstayafrica.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+27 21 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+27 82 123 4567" {...field} />
                  </FormControl>
                  <FormDescription>May differ from your main phone number</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Office Address</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="123 Main Road, Cape Town, 8001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Online Presence</CardTitle>
            <CardDescription>
              Links added here will appear in owner statement footers and client-facing documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <UrlFieldRow
                  icon={Globe}
                  label="Website"
                  placeholder="https://rightstayafrica.com"
                  field={field}
                />
              )}
            />
            <FormField
              control={form.control}
              name="instagramUrl"
              render={({ field }) => (
                <UrlFieldRow
                  icon={Instagram}
                  label="Instagram"
                  placeholder="https://instagram.com/rightstayafrica"
                  field={field}
                />
              )}
            />
            <FormField
              control={form.control}
              name="facebookUrl"
              render={({ field }) => (
                <UrlFieldRow
                  icon={Facebook}
                  label="Facebook"
                  placeholder="https://facebook.com/rightstayafrica"
                  field={field}
                />
              )}
            />
            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <UrlFieldRow
                  icon={Linkedin}
                  label="LinkedIn"
                  placeholder="https://linkedin.com/company/rightstayafrica"
                  field={field}
                />
              )}
            />
            <FormField
              control={form.control}
              name="twitterUrl"
              render={({ field }) => (
                <UrlFieldRow
                  icon={Twitter}
                  label="X / Twitter"
                  placeholder="https://x.com/rightstayafrica"
                  field={field}
                />
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Owner Statement Settings</CardTitle>
            <CardDescription>These details appear on every generated owner statement.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="statementFooterNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer Note</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="e.g. Payment will be processed within 3 business days of statement generation. For queries contact accounts@rightstayafrica.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Printed at the bottom of every owner statement PDF</FormDescription>
                  <p
                    className={cn(
                      "text-xs",
                      (footerNote?.length ?? 0) > 300 ? "text-red-600" : "text-slate-500"
                    )}
                  >
                    {(footerNote?.length ?? 0)}/300 characters
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Company Banking Details</CardTitle>
            <CardDescription>
              Used as a reference on owner statements for management fee payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. First National Bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder</FormLabel>
                  <FormControl>
                    <Input placeholder="Right Stay Africa (Pty) Ltd" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="62012345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Code</FormLabel>
                  <FormControl>
                    <Input placeholder="250655" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Account Type</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) =>
                      field.onChange(v === "" ? null : (v as CompanySettingsFormValues["accountType"]))
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="transmission">Transmission</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end pb-2">
          <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
