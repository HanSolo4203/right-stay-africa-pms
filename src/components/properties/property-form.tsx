"use client"

import { PropertyStatus, PropertyType } from "@prisma/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Minus, Plus } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { useSearchParams } from "next/navigation"
import {
  createProperty,
  deleteProperty,
  importPropertyFromUplisting,
  updateProperty,
} from "@/app/(dashboard)/dashboard/properties/actions"
import { FileUploader } from "@/components/shared/file-uploader"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import { ListingLinkPreview } from "@/components/properties/listing-link-preview"
import { propertySchema, type PropertyFormValues } from "@/lib/validations/property"

type PropertyFormProps = {
  mode: "create" | "edit"
  propertyId?: string
  initialValues?: PropertyFormValues
}

const typeOptions = Object.values(PropertyType)
const statusOptions = Object.values(PropertyStatus)

const defaultValues: PropertyFormValues = {
  name: "",
  address: "",
  suburb: "",
  city: "",
  unit_number: "",
  building_name: "",
  type: PropertyType.APARTMENT,
  bedrooms: 1,
  bathrooms: 1,
  parking_bays: [""],
  status: PropertyStatus.ONBOARDING,
  airbnb_listing_url: "",
  booking_com_listing_url: "",
  right_stay_commission_percent: undefined,
  welcome_pack_fee: undefined,
}

export function PropertyForm({ mode, propertyId, initialValues }: PropertyFormProps) {
  const searchParams = useSearchParams()
  const [isSaving, startSavingTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isImporting, startImportTransition] = useTransition()
  const [uplistingId, setUplistingId] = useState("")
  const [uplistingError, setUplistingError] = useState<string | null>(null)
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([])
  const [uploadBucket] = useState("property-files")

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as Resolver<PropertyFormValues>,
    defaultValues: initialValues ?? defaultValues,
  })

  useEffect(() => {
    if (mode !== "create") return
    const name = searchParams.get("name")
    const uid = searchParams.get("uplisting_id")
    if (name) {
      form.setValue("name", name, { shouldDirty: true })
    }
    if (uid) {
      setUplistingId(uid)
    }
  }, [mode, searchParams, form])

  const parkingBays = form.watch("parking_bays")
  const airbnbUrl = form.watch("airbnb_listing_url")
  const bookingUrl = form.watch("booking_com_listing_url")

  const onSubmit = (values: PropertyFormValues) => {
    startSavingTransition(async () => {
      if (mode === "create") {
        await createProperty(values)
        return
      }

      if (!propertyId) return
      await updateProperty(propertyId, values)
    })
  }

  const onDelete = () => {
    if (!propertyId) return
    startDeleteTransition(async () => {
      await deleteProperty(propertyId)
    })
  }

  const onImportFromUplisting = () => {
    const normalizedId = uplistingId.trim()
    if (!normalizedId) {
      setUplistingError("Enter a Uplisting property ID.")
      return
    }

    setUplistingError(null)
    startImportTransition(async () => {
      try {
        await importPropertyFromUplisting(normalizedId)
      } catch (error) {
        setUplistingError(error instanceof Error ? error.message : "Failed to import from Uplisting.")
      }
    })
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {mode === "create" ? (
            <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Import from Uplisting</h2>
                <p className="text-sm text-slate-600">
                  Paste a Uplisting property ID to pull property details into Right Stay Africa.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="w-full md:max-w-md">
                  <FormLabel htmlFor="uplisting-id">Uplisting Property ID</FormLabel>
                  <Input
                    id="uplisting-id"
                    value={uplistingId}
                    onChange={(event) => setUplistingId(event.target.value)}
                    placeholder="e.g. 12345"
                  />
                </div>
                <Button type="button" onClick={onImportFromUplisting} disabled={isImporting}>
                  {isImporting ? "Importing..." : "Import from Uplisting"}
                </Button>
              </div>
              {uplistingError ? <p className="text-sm text-red-600">{uplistingError}</p> : null}
            </section>
          ) : null}

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Basic</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Property name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Location</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Statement settings</h2>
            <p className="text-sm text-slate-600">
              Used on client and owner statements: management fee when CSV has no fee, and welcome pack
              charged once per included booking.
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <FormField
                control={form.control}
                name="right_stay_commission_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Right Stay commission (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="e.g. 15"
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === "") {
                            field.onChange(undefined)
                            return
                          }
                          const n = Number(v)
                          field.onChange(Number.isFinite(n) ? n : undefined)
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Management fee % on client statements when CSV fee is empty.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="welcome_pack_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome pack fee (per booking)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="e.g. 160"
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === "") {
                            field.onChange(undefined)
                            return
                          }
                          const n = Number(v)
                          field.onChange(Number.isFinite(n) ? n : undefined)
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      e.g. R160 for 305 Amalfi — added as an automatic expense per booking on statements.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) =>
                          field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) =>
                          field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="building_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Channel listings</h2>
              <p className="text-sm text-slate-600">
                Paste public listing URLs. Previews are quick link cards (Airbnb and Booking.com cannot be
                embedded here); click a card to open the live page in a new tab.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="airbnb_listing_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Airbnb listing URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder="https://www.airbnb.com/rooms/…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="booking_com_listing_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking.com listing URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder="https://www.booking.com/hotel/…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {(airbnbUrl?.trim() || bookingUrl?.trim()) && (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Preview</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
                  <ListingLinkPreview url={airbnbUrl ?? ""} channel="airbnb" />
                  <ListingLinkPreview url={bookingUrl ?? ""} channel="booking" />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Parking</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.setValue("parking_bays", [...parkingBays, ""], { shouldDirty: true })}
              >
                <Plus className="size-4" />
                Add Bay
              </Button>
            </div>

            <div className="space-y-3">
              {parkingBays.map((_, index) => (
                <div key={`parking-bay-${index}`} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`parking_bays.${index}`}
                    render={({ field: bayField }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Bay {index + 1}</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. B12" {...bayField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mt-6"
                    onClick={() => {
                      if (parkingBays.length === 1) return
                      form.setValue(
                        "parking_bays",
                        parkingBays.filter((_, bayIndex) => bayIndex !== index),
                        { shouldDirty: true }
                      )
                    }}
                    disabled={parkingBays.length === 1}
                  >
                    <Minus className="size-4" />
                    <span className="sr-only">Remove bay</span>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Documents & Media</h2>
            <FileUploader
              bucket={uploadBucket}
              storagePath={propertyId ? `properties/${propertyId}` : "properties/draft"}
              accept={{
                "image/*": [".png", ".jpg", ".jpeg", ".webp"],
                "application/pdf": [".pdf"],
              }}
              maxFiles={10}
              maxSizeMB={10}
              label="Upload photos or PDFs"
              onUploadComplete={setUploadedPaths}
            />

            {uploadedPaths.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Uploaded files</p>
                <ul className="space-y-2">
                  {uploadedPaths.map((path) => {
                    const fileName = path.split("/").pop() ?? path
                    return (
                      <li key={path} className="flex items-center justify-between gap-3 rounded-md border p-2">
                        <span className="truncate text-sm text-slate-700">{fileName}</span>
                        <span className="text-xs text-slate-500">{path}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </section>

          <div className="flex items-center justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Property"}
            </Button>
          </div>
        </form>
      </Form>

      {mode === "edit" && propertyId ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
          <p className="mt-1 text-sm text-red-700/80">
            Deleting this property will also delete all related records.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4" disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Property"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this property?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All associated data will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Property
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      ) : null}
    </div>
  )
}
