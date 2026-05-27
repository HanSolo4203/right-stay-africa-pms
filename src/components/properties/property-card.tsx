"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { PropertyStatus } from "@prisma/client"
import { Bath, BedSingle, Building2 } from "lucide-react"
import { PropertyRemoteImage } from "@/components/properties/property-remote-image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type PropertyCardProps = {
  property: {
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
  }
}

const statusStyles: Record<PropertyStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800 hover:bg-green-100",
  INACTIVE: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  ONBOARDING: "bg-amber-100 text-amber-800 hover:bg-amber-100",
}

const statusLabels: Record<PropertyStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ONBOARDING: "Onboarding",
}

export function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter()
  const href = `/dashboard/properties/${property.id}`

  const addressLine = property.unit_number
    ? `${property.address}, Unit ${property.unit_number}`
    : property.address

  return (
    <Link
      href={href}
      prefetch
      className="block"
      onMouseEnter={() => router.prefetch(href)}
    >
      <Card className="spike-card h-full overflow-hidden border-0 pt-0 transition-shadow hover:shadow-[var(--spike-card-shadow)]">
        <div className="h-[200px] w-full overflow-hidden bg-[rgba(255,255,255,0.06)]">
          {property.cover_photo_url ? (
            <PropertyRemoteImage
              src={property.cover_photo_url}
              alt={property.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center spike-text-muted">
              <Building2 className="size-8" />
            </div>
          )}
        </div>

        <CardContent className="space-y-3 px-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold spike-heading">{property.name}</h3>
              <p className="text-sm spike-text-secondary">{addressLine}</p>
            </div>
            <Badge className={statusStyles[property.status]}>
              {statusLabels[property.status]}
            </Badge>
          </div>

          <p className="text-sm spike-text-secondary">
            {property.owner?.full_name ?? (
              <span className="spike-text-muted">No owner linked</span>
            )}
          </p>

          <div className="flex items-center gap-4 text-sm spike-text-secondary">
            <span className="inline-flex items-center gap-1">
              <BedSingle className="size-4" />
              {property.bedrooms}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bath className="size-4" />
              {property.bathrooms}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
