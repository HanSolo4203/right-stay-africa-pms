import { Skeleton } from "@/components/ui/skeleton"

export function ReportsContentSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading reports">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-xl bg-slate-200/80" />
        ))}
      </div>
      <Skeleton className="h-[340px] rounded-xl bg-slate-200/80" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-[420px] rounded-xl bg-slate-200/80 lg:col-span-7" />
        <Skeleton className="h-[420px] rounded-xl bg-slate-200/80 lg:col-span-5" />
      </div>
      <Skeleton className="h-[480px] rounded-xl bg-slate-200/80" />
      <Skeleton className="h-[280px] rounded-xl bg-slate-200/80" />
    </div>
  )
}
