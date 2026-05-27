import { Suspense } from "react"
import { ReportsPlatformsView } from "@/components/reports/reports-platforms-view"
import { ReportsContentSkeleton } from "@/components/reports/reports-skeleton"

export default function ReportsPlatformsPage() {
  return (
    <Suspense fallback={<ReportsContentSkeleton />}>
      <ReportsPlatformsView />
    </Suspense>
  )
}
