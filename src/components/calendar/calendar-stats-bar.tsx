"use client"

type CalendarStatsBarProps = {
  bookedNights: number
  availableNights: number
  occupancyPct: number
  nightsRemaining: number | null
}

export function CalendarStatsBar({
  bookedNights,
  availableNights,
  occupancyPct,
  nightsRemaining,
}: CalendarStatsBarProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
        <span className="size-2 rounded-full bg-green" aria-hidden />
        <span className="font-bold tabular-nums text-slate-900">{bookedNights}</span>
        <span className="text-slate-500">Booked nights</span>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
        <span className="size-2 rounded-full bg-slate-300" aria-hidden />
        <span className="font-bold tabular-nums text-slate-900">{availableNights}</span>
        <span className="text-slate-500">Available</span>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
        <span className="size-2 rounded-full bg-green-dark" aria-hidden />
        <span className="font-bold tabular-nums text-slate-900">{occupancyPct}%</span>
        <span className="text-slate-500">Occupancy</span>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
        <span className="size-2 rounded-full bg-green-accent" aria-hidden />
        <span className="font-bold tabular-nums text-slate-900">
          {nightsRemaining != null ? nightsRemaining : "—"}
        </span>
        <span className="text-slate-500">Nights left</span>
      </div>
    </div>
  )
}
