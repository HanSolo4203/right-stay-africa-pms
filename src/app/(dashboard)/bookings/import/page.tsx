import { redirect } from "next/navigation"
import { CsvImportPanel } from "@/components/bookings/csv-import-panel"
import { getUser } from "@/lib/auth/get-user"

export default async function BookingsImportPage() {
  const user = await getUser()
  if (!user) {
    redirect("/login")
  }

  const canImport = user.role === "SUPER_ADMIN" || user.role === "PROPERTY_MANAGER"

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Booking CSV import</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a monthly booking report exported from Uplisting to sync bookings into Right Stay
          Africa.
        </p>
      </div>
      <CsvImportPanel canImport={canImport} />
    </div>
  )
}
