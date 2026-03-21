import { Suspense } from "react"
import { PropertyDetailHeader } from "./property-detail-header"
import { PropertyDetailTabs } from "./property-detail-tabs"
import { isValidPropertyTab, type PropertyTab } from "./property-detail-shared"
import { PropertyHeaderSkeleton } from "./property-header-skeleton"
import { PropertyTabsSkeleton } from "./property-tabs-skeleton"

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ tab?: string }>
}

export default async function PropertyDetailPage({ params, searchParams }: PropertyDetailPageProps) {
  const { id } = await params
  const tab = (await searchParams)?.tab
  const activeTab: PropertyTab = isValidPropertyTab(tab) ? tab : "overview"

  return (
    <div className="space-y-6">
      <Suspense fallback={<PropertyHeaderSkeleton />}>
        <PropertyDetailHeader propertyId={id} />
      </Suspense>
      <Suspense fallback={<PropertyTabsSkeleton />}>
        <PropertyDetailTabs propertyId={id} activeTab={activeTab} />
      </Suspense>
    </div>
  )
}
