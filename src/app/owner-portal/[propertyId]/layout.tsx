import { notFound, redirect } from "next/navigation"
import { OwnerAccessDenied } from "@/components/owner-portal/owner-access-denied"
import { OwnerPortalTabNav } from "@/components/owner-portal/owner-portal-tab-nav"
import { OwnerPropertyHeader } from "@/components/owner-portal/owner-property-header"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

type OwnerPropertyLayoutProps = {
  children: React.ReactNode
  params: Promise<{ propertyId: string }>
}

export default async function OwnerPropertyLayout({ children, params }: OwnerPropertyLayoutProps) {
  const { propertyId } = await params
  const user = await getUser()
  if (!user?.id || user.role !== "OWNER") {
    redirect("/login")
  }

  const owner = await prisma.owner.findFirst({
    where: { portal_user_id: user.id },
    select: { property_id: true },
  })

  if (!owner || owner.property_id !== propertyId) {
    return (
      <div className="py-4">
        <OwnerAccessDenied />
      </div>
    )
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      name: true,
      address: true,
      unit_number: true,
      cover_photo_url: true,
    },
  })

  if (!property) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <OwnerPropertyHeader property={property} />
      <OwnerPortalTabNav propertyId={propertyId} />
      <div>{children}</div>
    </div>
  )
}
