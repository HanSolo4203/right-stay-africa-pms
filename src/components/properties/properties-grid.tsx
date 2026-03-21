"use client"

import Link from "next/link"
import { FileSpreadsheet, Plus, Search, Building2 } from "lucide-react"
import { useMemo, useState } from "react"
import { PropertyStatus } from "@prisma/client"
import { ImportAllFromUplistingButton } from "@/components/properties/import-all-from-uplisting-button"
import { PropertyCard } from "@/components/properties/property-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type PropertiesGridProps = {
  canImportBookings?: boolean
  properties: Array<{
    id: string
    name: string
    address: string
    unit_number: string | null
    status: PropertyStatus
    cover_photo_url: string | null
    bedrooms: number
    bathrooms: number
    owner: {
      full_name: string
    } | null
  }>
}

export function PropertiesGrid({ properties, canImportBookings = false }: PropertiesGridProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return properties

    return properties.filter((property) => {
      return (
        property.name.toLowerCase().includes(normalized) ||
        property.address.toLowerCase().includes(normalized)
      )
    })
  }, [properties, query])

  const showEmpty = properties.length === 0

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Properties</h2>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <ImportAllFromUplistingButton />
          {canImportBookings ? (
            <Button asChild variant="outline" className="border-green-200 text-green-800 hover:bg-green-50">
              <Link href="/bookings/import">
                <FileSpreadsheet className="size-4" />
                Import bookings (CSV)
              </Link>
            </Button>
          ) : null}
          <Button asChild className="bg-green-700 text-white hover:bg-green-800">
            <Link href="/dashboard/properties/new">
              <Plus className="size-4" />
              Add Property
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by property name or address"
          className="pl-8"
        />
      </div>

      {showEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
            <Building2 className="size-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No properties yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first property to get started.</p>
          <Button asChild className="mt-5 bg-green-700 text-white hover:bg-green-800">
            <Link href="/dashboard/properties/new">
              <Plus className="size-4" />
              Add your first property
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No properties match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </section>
  )
}
