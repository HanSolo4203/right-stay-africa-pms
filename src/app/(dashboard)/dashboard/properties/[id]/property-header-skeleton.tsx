/** Matches `PropertyHeader` layout so the shell appears immediately while the light header query runs. */
export function PropertyHeaderSkeleton() {
  return (
    <section
      className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white"
      aria-busy="true"
      aria-label="Loading property header"
    >
      <div className="grid gap-2 bg-slate-100 p-2 md:grid-cols-5 md:gap-3 md:p-3">
        <div className="min-h-[200px] rounded-lg bg-slate-200 md:col-span-3 md:min-h-[280px]" />
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:col-span-2 md:mt-0 md:grid-cols-2">
          <div className="aspect-[4/3] rounded-lg bg-slate-200" />
          <div className="aspect-[4/3] rounded-lg bg-slate-200" />
          <div className="aspect-[4/3] rounded-lg bg-slate-200" />
          <div className="aspect-[4/3] rounded-lg bg-slate-200" />
        </div>
      </div>
      <div className="flex flex-col gap-3 p-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 max-w-full rounded-lg bg-slate-200" />
          <div className="h-4 w-48 max-w-full rounded bg-slate-100" />
          <div className="h-3 w-32 rounded bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md bg-slate-200" />
          <div className="h-9 w-16 rounded-md bg-slate-200" />
        </div>
      </div>
    </section>
  )
}
