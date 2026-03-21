"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useTransition } from "react"
import { useForm } from "react-hook-form"
import { deleteOwner, saveOwner } from "@/app/(dashboard)/properties/[id]/owner/actions"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { ownerSchema, type OwnerFormValues } from "@/lib/validations/owner"

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

type OwnerFormModalProps = {
  propertyId: string
  owner: OwnerData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const emptyValues: OwnerFormValues = {
  full_name: "",
  phone: "",
  email: "",
  id_number: "",
  bank_name: "",
  account_number: "",
  branch_code: "",
  notes: "",
}

export function OwnerFormModal({ propertyId, owner, open, onOpenChange }: OwnerFormModalProps) {
  const router = useRouter()
  const [isSaving, startSaveTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const initialValues = useMemo<OwnerFormValues>(() => {
    if (!owner) return emptyValues

    return {
      full_name: owner.full_name,
      phone: owner.phone,
      email: owner.email,
      id_number: owner.id_number ?? "",
      bank_name: owner.bank_name ?? "",
      account_number: owner.account_number ?? "",
      branch_code: owner.branch_code ?? "",
      notes: owner.notes ?? "",
    }
  }, [owner])

  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(initialValues)
    }
  }, [form, initialValues, open])

  const onSubmit = (values: OwnerFormValues) => {
    startSaveTransition(async () => {
      await saveOwner(propertyId, values)
      onOpenChange(false)
      router.refresh()
    })
  }

  const onDelete = () => {
    startDeleteTransition(async () => {
      await deleteOwner(propertyId)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{owner ? "Edit Owner Details" : "Add Owner Details"}</DialogTitle>
          <DialogDescription>
            Save contact, banking and notes information for this property owner.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Contact Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Owner full name" {...field} />
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
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
                        <Input type="email" placeholder="owner@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="id_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Bank Details</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branch_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Optional notes" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <DialogFooter className="border-t pt-4">
              {owner ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSaving || isDeleting}
                  onClick={onDelete}
                  className="mr-auto"
                >
                  {isDeleting ? "Removing..." : "Remove Owner"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isDeleting}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
