import { Suspense } from "react"
import { ReportsMonthlyView } from "@/components/reports/reports-monthly-view"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"

export default function ReportsMonthlyPage() {
  return (
    <Suspense fallback={<ReportsContentSkeleton />}>
      <ReportsMonthlyView />
    </Suspense>
  )
}
