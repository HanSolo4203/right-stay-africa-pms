"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { saveInfoGuide } from "@/app/(dashboard)/properties/[id]/info-guide/actions"
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
import { infoGuideSchema, type InfoGuideFormValues } from "@/lib/validations/info-guide"

type EmergencyContact = {
  name: string
  phone: string
}

type InfoGuideData = {
  wifi_name: string | null
  wifi_password: string | null
  parking_instructions: string | null
  access_code: string | null
  lockbox_code: string | null
  electricity_notes: string | null
  emergency_contacts: EmergencyContact[]
  notes: string | null
}

type InfoGuideFormModalProps = {
  propertyId: string
  infoGuide: InfoGuideData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const emptyValues: InfoGuideFormValues = {
  wifi_name: "",
  wifi_password: "",
  parking_instructions: "",
  access_code: "",
  lockbox_code: "",
  electricity_notes: "",
  emergency_contacts: [],
  notes: "",
}

export function InfoGuideFormModal({ propertyId, infoGuide, open, onOpenChange }: InfoGuideFormModalProps) {
  const router = useRouter()
  const [isSaving, startSaveTransition] = useTransition()
  const [showWifiPassword, setShowWifiPassword] = useState(false)

  const initialValues = useMemo<InfoGuideFormValues>(() => {
    if (!infoGuide) return emptyValues

    return {
      wifi_name: infoGuide.wifi_name ?? "",
      wifi_password: infoGuide.wifi_password ?? "",
      parking_instructions: infoGuide.parking_instructions ?? "",
      access_code: infoGuide.access_code ?? "",
      lockbox_code: infoGuide.lockbox_code ?? "",
      electricity_notes: infoGuide.electricity_notes ?? "",
      emergency_contacts: infoGuide.emergency_contacts ?? [],
      notes: infoGuide.notes ?? "",
    }
  }, [infoGuide])

  const form = useForm<InfoGuideFormValues>({
    resolver: zodResolver(infoGuideSchema),
    defaultValues: initialValues,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emergency_contacts",
  })

  useEffect(() => {
    if (open) {
      form.reset(initialValues)
      setShowWifiPassword(false)
    }
  }, [form, initialValues, open])

  const onSubmit = (values: InfoGuideFormValues) => {
    startSaveTransition(async () => {
      await saveInfoGuide(propertyId, values)
      onOpenChange(false)
      router.refresh()
    })
  }

  const canAddContact = fields.length < 6

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{infoGuide ? "Edit Info Guide" : "Set Up Info Guide"}</DialogTitle>
          <DialogDescription>
            Save guest-facing details like access, utilities, and emergency contacts.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Connectivity & Access</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="wifi_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wifi Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wifi_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wifi Password</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type={showWifiPassword ? "text" : "password"}
                            placeholder="Optional"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowWifiPassword((current) => !current)}
                          >
                            {showWifiPassword ? "Hide" : "Show"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="access_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lockbox_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lockbox Code</FormLabel>
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
              <h3 className="text-sm font-semibold text-slate-900">Property Notes</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="parking_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Instructions</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="electricity_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Electricity Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Emergency Contacts</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: "", phone: "" })}
                  disabled={!canAddContact}
                >
                  <Plus className="mr-2 size-4" />
                  Add Contact
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="text-sm text-slate-500">No emergency contacts added yet.</p>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-5">
                      <FormField
                        control={form.control}
                        name={`emergency_contacts.${index}.name`}
                        render={({ field: nameField }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Contact name" {...nameField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`emergency_contacts.${index}.phone`}
                        render={({ field: phoneField }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...phoneField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove contact</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
