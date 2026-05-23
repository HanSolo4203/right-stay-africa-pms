import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ClientsStatementsView } from "@/components/clients/clients-statements-view"
import { Skeleton } from "@/components/ui/skeleton"
import { getUser } from "@/lib/auth/get-user"

function StatementsFallback() {
  return (
    <div className="flex gap-4">
      <Skeleton className="h-[400px] w-1/3" />
      <Skeleton className="h-[400px] flex-1" />
    </div>
  )
}

export default async function ClientsStatementsPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  if (user.role !== "SUPER_ADMIN" && user.role !== "PROPERTY_MANAGER") {
    redirect("/dashboard")
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Statements</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review previous, current, and future payout statements in one place. Open any row to edit
          bookings, expenses, or regenerate a PDF.
        </p>
      </div>
      <Suspense fallback={<StatementsFallback />}>
        <ClientsStatementsView />
      </Suspense>
    </section>
  )
}
