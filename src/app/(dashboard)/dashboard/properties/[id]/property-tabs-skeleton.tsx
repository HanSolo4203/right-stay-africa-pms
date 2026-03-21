/** Matches tab strip + first card while relations + bookings load. */
export function PropertyTabsSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-4" aria-busy="true" aria-label="Loading property tabs">
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 shrink-0 rounded-md bg-slate-200" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-3/4 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
