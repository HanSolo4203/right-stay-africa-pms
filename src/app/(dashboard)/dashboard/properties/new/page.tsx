import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { PropertyForm } from "@/components/properties/property-form"
import { Button } from "@/components/ui/button"

function PropertyFormFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
      Loading form…
    </div>
  )
}

export default function NewPropertyPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Add Property</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/properties">
            <ArrowLeft className="size-4" />
            Back to Properties
          </Link>
        </Button>
      </div>
      <Suspense fallback={<PropertyFormFallback />}>
        <PropertyForm mode="create" />
      </Suspense>
    </section>
  )
}
