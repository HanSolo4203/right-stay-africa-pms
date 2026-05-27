import { Suspense } from "react"
import { ReportsOverviewView } from "@/components/reports/reports-overview-view"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"

export default function ReportsOverviewPage() {
  return (
    <Suspense fallback={<ReportsContentSkeleton />}>
      <ReportsOverviewView />
    </Suspense>
  )
}
