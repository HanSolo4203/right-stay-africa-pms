import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/get-user"
import { prisma } from "@/lib/prisma"

export default async function OwnerPortalIndexPage() {
  const user = await getUser()
  if (!user?.id || user.role !== "OWNER") {
    redirect("/login")
  }

  const owner = await prisma.owner.findFirst({
    where: { portal_user_id: user.id },
    select: { property_id: true },
  })

  if (!owner) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-700">
          Your account isn&apos;t linked to a property yet. Contact Right Stay Africa.
        </p>
      </div>
    )
  }

  redirect(`/owner-portal/${owner.property_id}`)
}
