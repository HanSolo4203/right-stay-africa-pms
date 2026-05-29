"use client"

import { PLATFORM_COLORS } from "@/lib/calendar/platform-colors"

type CalendarLegendProps = {
  showCleaningMarkers?: boolean
}

export function CalendarLegend({ showCleaningMarkers = false }: CalendarLegendProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-slate-500">Platforms:</span>
      {Object.entries(PLATFORM_COLORS).map(([key, color]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color.bg }} />
          <span className="text-xs text-slate-600">{color.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm border border-dashed border-slate-400 bg-slate-200" />
        <span className="text-xs text-slate-600">Available</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm border border-rose-300 bg-rose-100" />
        <span className="text-xs text-slate-600">Cancelled</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1 w-3 rounded-full bg-amber-400" />
        <span className="text-xs text-slate-600">Short gap (≤3 nights)</span>
      </div>
      {showCleaningMarkers ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-600">Checkout clean</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-600">Mid-stay clean</span>
          </div>
        </>
      ) : null}
    </div>
  )
}
