import Link from "next/link"
import { PropertyStatus } from "@prisma/client"
import { Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PropertyUplistingSyncButton } from "@/components/properties/property-uplisting-sync-button"
import { cn } from "@/lib/utils"

type PropertyHeaderProps = {
  property: {
    id: string
    name: string
    address: string
    unit_number: string | null
    status: PropertyStatus
    cover_photo_url: string | null
  }
  uplistingId: string | null
  /** Ordered gallery: first = hero, rest shown as tiles (from DB + cover). */
  galleryUrls?: string[]
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

const MAX_TILES = 6
const TILES_BEFORE_OVERFLOW = 5

export function PropertyHeader({ property, uplistingId, galleryUrls = [] }: PropertyHeaderProps) {
  const ordered =
    galleryUrls.length > 0
      ? galleryUrls
      : property.cover_photo_url
        ? [property.cover_photo_url]
        : []

  const heroUrl = ordered[0] ?? null
  const tiles = ordered.slice(1)
  const hasTiles = tiles.length > 0
  const photosTabHref = `/dashboard/properties/${property.id}?tab=photos`
  const showOverflowTile = tiles.length > TILES_BEFORE_OVERFLOW
  const tilesToRender = showOverflowTile ? tiles.slice(0, TILES_BEFORE_OVERFLOW) : tiles.slice(0, MAX_TILES)
  const overflowCount = showOverflowTile ? tiles.length - TILES_BEFORE_OVERFLOW : 0

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        className={cn(
          "bg-slate-100 p-2 md:p-3",
          hasTiles ? "md:grid md:grid-cols-5 md:gap-3" : ""
        )}
      >
        {/* Hero */}
        <div
          className={cn(
            "relative overflow-hidden rounded-lg bg-slate-200",
            hasTiles
              ? "min-h-[200px] md:col-span-3 md:min-h-[280px]"
              : "min-h-[220px] w-full md:min-h-[280px]"
          )}
        >
          {heroUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- remote property URLs (Supabase / Uplisting) */
            <img
              src={heroUrl}
              alt={`${property.name} — main photo`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex w-full items-center justify-center text-slate-500",
                hasTiles ? "min-h-[200px] md:min-h-[280px]" : "min-h-[220px] md:min-h-[280px]"
              )}
            >
              <Building2 className="size-10" aria-hidden />
              <span className="sr-only">No cover image</span>
            </div>
          )}
        </div>

        {/* Thumbnail tiles */}
        {hasTiles ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:col-span-2 md:mt-0 md:grid-cols-2 md:content-start md:gap-2">
            {tilesToRender.map((url, i) => (
              <Link
                key={`${url}-${i}`}
                href={photosTabHref}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-200 ring-1 ring-slate-200/80 transition ring-inset hover:ring-green-600/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </Link>
            ))}
            {showOverflowTile ? (
              <Link
                href={photosTabHref}
                className="flex aspect-[4/3] items-center justify-center rounded-lg bg-slate-900/85 text-center text-sm font-semibold text-white ring-1 ring-slate-700/20 transition hover:bg-slate-900"
              >
                +{overflowCount} more
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 p-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
            <Badge className={statusStyles[property.status]}>{statusLabels[property.status]}</Badge>
          </div>
          <p className="text-sm text-slate-600">{property.address}</p>
          {property.unit_number ? (
            <p className="text-sm text-slate-600">Unit {property.unit_number}</p>
          ) : null}
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-600">Uplisting ID:</span>{" "}
            {uplistingId ? (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">{uplistingId}</code>
            ) : (
              <span className="italic">Not linked</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {uplistingId ? <PropertyUplistingSyncButton propertyId={property.id} /> : null}
          <Button asChild variant="outline">
            <Link href={`/dashboard/properties/${property.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
