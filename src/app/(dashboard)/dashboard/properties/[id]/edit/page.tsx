import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { PropertyForm } from "@/components/properties/property-form"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"

type EditPropertyPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params
  const property = await prisma.property.findUnique({
    where: {
      id,
    },
  })

  if (!property) {
    notFound()
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Property</h1>
        <Button asChild variant="outline">
          <Link href={`/dashboard/properties/${property.id}`}>
            <ArrowLeft className="size-4" />
            Back to Property
          </Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading form…
          </div>
        }
      >
        <PropertyForm
          mode="edit"
          propertyId={property.id}
          initialValues={{
            name: property.name,
            address: property.address,
            suburb: property.suburb ?? "",
            city: property.city,
            unit_number: property.unit_number ?? "",
            building_name: property.building_name ?? "",
            type: property.type,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            parking_bays: property.parking_bays.length > 0 ? property.parking_bays : [""],
            status: property.status,
            airbnb_listing_url: property.airbnb_listing_url ?? "",
            booking_com_listing_url: property.booking_com_listing_url ?? "",
            right_stay_commission_percent:
              property.right_stay_commission_percent != null
                ? Number(property.right_stay_commission_percent)
                : undefined,
          }}
        />
      </Suspense>
    </section>
  )
}
