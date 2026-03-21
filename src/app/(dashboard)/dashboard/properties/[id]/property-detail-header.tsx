import { notFound } from "next/navigation"
import { PropertyHeader } from "@/components/properties/property-header"
import { prisma } from "@/lib/prisma"

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.filter((u) => {
    const t = u.trim()
    if (!t || seen.has(t)) return false
    seen.add(t)
    return true
  })
}

export async function PropertyDetailHeader({ propertyId }: { propertyId: string }) {
  const [property, photos] = await Promise.all([
    prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        name: true,
        address: true,
        unit_number: true,
        status: true,
        cover_photo_url: true,
        uplisting_id: true,
      },
    }),
    prisma.photo.findMany({
      where: { property_id: propertyId },
      orderBy: [{ is_cover: "desc" }, { created_at: "asc" }],
      select: { url: true },
    }),
  ])

  if (!property) {
    notFound()
  }

  const fromDb = photos.map((p) => p.url).filter(Boolean)
  let galleryUrls = dedupeUrls(fromDb)
  const cover = property.cover_photo_url?.trim()
  if (cover) {
    galleryUrls = dedupeUrls([cover, ...galleryUrls])
  }

  return <PropertyHeader property={property} uplistingId={property.uplisting_id} galleryUrls={galleryUrls} />
}
