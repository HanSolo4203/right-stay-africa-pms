import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ClientsAccountDetailsView } from "@/components/clients/clients-account-details-view"
import { Skeleton } from "@/components/ui/skeleton"
import { getUser } from "@/lib/auth/get-user"

function Fallback() {
  return (
    <div className="flex gap-4 p-4">
      <Skeleton className="h-[400px] w-1/3" />
      <Skeleton className="h-[400px] flex-1" />
    </div>
  )
}

export default async function AccountDetailsPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    redirect("/dashboard")
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Account Details</h2>
        <p className="mt-1 text-sm text-slate-600">
          Client profile, banking details for payouts, and linked properties.
        </p>
      </div>
      <Suspense fallback={<Fallback />}>
        <ClientsAccountDetailsView />
      </Suspense>
    </section>
  )
}
