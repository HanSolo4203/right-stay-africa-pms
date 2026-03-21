import { PropertiesGrid } from "@/components/properties/properties-grid"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

export default async function PropertiesPage() {
  const [properties, user] = await Promise.all([
    prisma.property.findMany({
      include: {
        owner: {
          select: {
            full_name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    }),
    getUser(),
  ])

  const canImportBookings =
    user?.role === "SUPER_ADMIN" || user?.role === "PROPERTY_MANAGER"

  return (
    <PropertiesGrid properties={properties} canImportBookings={canImportBookings} />
  )
}
