"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function CleaningSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-5 w-48" />
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  )
}

