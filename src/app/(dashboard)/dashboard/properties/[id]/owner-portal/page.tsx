import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { OwnerPortalPickUser } from "@/components/owners/owner-portal-pick-user"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin } from "@/lib/supabase/admin"

type OwnerPortalPageProps = {
  params: Promise<{ id: string }>
}

export default async function OwnerPortalLinkPage({ params }: OwnerPortalPageProps) {
  const { id } = await params
  const [user, property] = await Promise.all([
    getUser(),
    prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        owner: {
          select: {
            portal_user_id: true,
          },
        },
      },
    }),
  ])

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    redirect("/dashboard")
  }

  if (!property) {
    notFound()
  }

  const portalUserId = property.owner?.portal_user_id ?? null

  let linkedUserLabel: string | null = null
  if (portalUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(portalUserId)
    if (!error && data.user) {
      const metaName =
        typeof data.user.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name.trim()
          : ""
      const email = data.user.email ?? ""
      linkedUserLabel = metaName ? `${email} · ${metaName}` : email || portalUserId
    } else {
      linkedUserLabel = `${portalUserId} (auth user not found — re-link may be needed)`
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 h-8 px-2 text-slate-600">
            <Link href={`/dashboard/properties/${property.id}?tab=owner`}>
              <ArrowLeft className="mr-1 size-4" />
              Back to property
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900">Owner portal access</h1>
          <p className="mt-1 text-sm text-slate-600">{property.name}</p>
        </div>
      </div>

      <OwnerPortalPickUser
        propertyId={property.id}
        propertyName={property.name}
        hasOwnerRecord={Boolean(property.owner)}
        linkedUserId={portalUserId}
        linkedUserLabel={linkedUserLabel}
      />
    </div>
  )
}
