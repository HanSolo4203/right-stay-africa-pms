/** Shared skeleton for dashboard route `loading.tsx` files — instant feedback on client navigations. */
export function MainContentSkeleton() {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-9 max-w-md rounded-lg bg-slate-200" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-4/5 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-28 rounded-xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-28 rounded-xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  )
}
