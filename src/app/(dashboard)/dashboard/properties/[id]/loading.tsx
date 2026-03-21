import { PropertyHeaderSkeleton } from "./property-header-skeleton"
import { PropertyTabsSkeleton } from "./property-tabs-skeleton"

/** First paint before streamed Suspense fallbacks hydrate (e.g. hard navigation). */
export default function PropertyDetailLoading() {
  return (
    <div className="space-y-6">
      <PropertyHeaderSkeleton />
      <PropertyTabsSkeleton />
    </div>
  )
}
