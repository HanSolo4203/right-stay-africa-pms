import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ClientsManagementFeesView } from "@/components/clients/clients-management-fees-view"
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

export default async function ManagementFeesPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    redirect("/dashboard")
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Management Fees</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure management fee rates per property and review fees earned each month.
        </p>
      </div>
      <Suspense fallback={<Fallback />}>
        <ClientsManagementFeesView />
      </Suspense>
    </section>
  )
}
