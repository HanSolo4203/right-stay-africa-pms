import { Suspense } from "react"
import { ReportsPropertiesView } from "@/components/reports/reports-properties-view"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"

export default function ReportsPropertiesPage() {
  return (
    <Suspense fallback={<ReportsContentSkeleton />}>
      <ReportsPropertiesView />
    </Suspense>
  )
}
