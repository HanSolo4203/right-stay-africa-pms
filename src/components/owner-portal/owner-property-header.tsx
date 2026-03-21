import { Building2 } from "lucide-react"

type OwnerPropertyHeaderProps = {
  property: {
    name: string
    address: string
    unit_number: string | null
    cover_photo_url: string | null
  }
}

export function OwnerPropertyHeader({ property }: OwnerPropertyHeaderProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-48 w-full bg-slate-200 sm:h-[220px]">
        {property.cover_photo_url ? (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${property.cover_photo_url}")` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            <Building2 className="size-10" />
          </div>
        )}
      </div>

      <div className="space-y-1 p-4 sm:p-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{property.name}</h1>
        <p className="text-sm text-slate-600">{property.address}</p>
        {property.unit_number ? (
          <p className="text-sm text-slate-600">Unit {property.unit_number}</p>
        ) : null}
      </div>
    </section>
  )
}
