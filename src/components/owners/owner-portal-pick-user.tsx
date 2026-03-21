"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  linkOwnerPortalUser,
  unlinkOwnerPortalUser,
} from "@/app/(dashboard)/properties/[id]/owner/portal-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

type Candidate = {
  id: string
  email: string
  full_name: string
}

const createOwnerAccountSchema = z.object({
  email: z.email("A valid email is required."),
  full_name: z.string().min(1, "Full name is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

type CreateOwnerAccountValues = z.infer<typeof createOwnerAccountSchema>

type OwnerPortalPickUserProps = {
  propertyId: string
  propertyName: string
  hasOwnerRecord: boolean
  linkedUserId: string | null
  linkedUserLabel: string | null
}

async function fetchOwnerCandidates(): Promise<Candidate[]> {
  const res = await fetch("/api/auth/owner-role-users")
  const body = (await res.json()) as { users?: Candidate[]; error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to load users.")
  }
  return body.users ?? []
}

function CreateOwnerAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (authUserId: string) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<CreateOwnerAccountValues>({
    resolver: zodResolver(createOwnerAccountSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ email: "", full_name: "", password: "" })
    }
  }, [open, form])

  const onSubmit = async (values: CreateOwnerAccountValues) => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim(),
          full_name: values.full_name.trim(),
          password: values.password,
          role: "OWNER",
        }),
      })
      const body = (await res.json()) as {
        auth_user_id?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create account.")
      }
      if (!body.auth_user_id) {
        throw new Error("Account created but no user id returned.")
      }
      toast.success("Owner account created. You can link them below.")
      onOpenChange(false)
      onCreated(body.auth_user_id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create account.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create owner account</DialogTitle>
          <DialogDescription>
            Creates a Supabase login with role <strong>OWNER</strong> and adds them to your team list. Share the password
            with the owner securely, then link them to this property.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Owner name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="owner@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="At least 8 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function OwnerPortalPickUser({
  propertyId,
  propertyName,
  hasOwnerRecord,
  linkedUserId,
  linkedUserLabel,
}: OwnerPortalPickUserProps) {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [selectedId, setSelectedId] = useState<string>("")
  const [createOpen, setCreateOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const refreshCandidates = useCallback(async () => {
    try {
      const users = await fetchOwnerCandidates()
      setCandidates(users)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load users.")
    }
  }, [])

  useEffect(() => {
    void refreshCandidates()
  }, [refreshCandidates])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.full_name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    )
  }, [candidates, filter])

  const onLink = useCallback(() => {
    if (!selectedId) {
      toast.error("Choose a user with the Owner role.")
      return
    }
    startTransition(async () => {
      try {
        await linkOwnerPortalUser(propertyId, selectedId)
        toast.success("Owner portal account linked.")
        router.refresh()
        setSelectedId("")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not link account.")
      }
    })
  }, [propertyId, router, selectedId])

  const onUnlink = useCallback(() => {
    startTransition(async () => {
      try {
        await unlinkOwnerPortalUser(propertyId)
        toast.success("Portal access removed.")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not remove access.")
      }
    })
  }, [propertyId, router])

  const onOwnerCreated = useCallback(
    (authUserId: string) => {
      void refreshCandidates().then(() => {
        setSelectedId(authUserId)
      })
    },
    [refreshCandidates]
  )

  if (!hasOwnerRecord) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base">Owner record required</CardTitle>
          <CardDescription>
            Save owner contact details for <span className="font-medium text-slate-800">{propertyName}</span> before
            you can link a portal login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="bg-white">
            <Link href={`/dashboard/properties/${propertyId}?tab=owner`}>Go to Owner tab</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Link login account</CardTitle>
          <CardDescription>
            Choose a Supabase user whose role is <strong>OWNER</strong>. They will see this property at{" "}
            <span className="font-medium text-slate-800">/owner-portal</span> after linking.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2 bg-white" onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          Create owner account
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <CreateOwnerAccountDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={onOwnerCreated} />

        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Currently linked</p>
          {linkedUserId && linkedUserLabel ? (
            <p className="mt-1 text-sm text-slate-900">{linkedUserLabel}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">No portal login linked yet.</p>
          )}
          {linkedUserId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 bg-white"
              disabled={isPending}
              onClick={onUnlink}
            >
              Remove portal access
            </Button>
          ) : null}
        </div>

        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="owner-user-filter">Search users</Label>
              <Input
                id="owner-user-filter"
                placeholder="Filter by email or name…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Owner-role account</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {filtered.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-slate-500">No matching users.</div>
                  ) : (
                    filtered.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="truncate">
                          {c.email}
                          {c.full_name ? ` · ${c.full_name}` : ""}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Create a new owner login with the button above, or pick someone who already has the Owner role.
              </p>
            </div>

            <Button type="button" disabled={isPending || !selectedId} onClick={onLink}>
              {isPending ? "Saving…" : "Link selected user"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
