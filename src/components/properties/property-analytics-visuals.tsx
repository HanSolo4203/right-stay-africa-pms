"use client"

import type {
  AnalyticsMonthPoint,
  ChannelGrossSlice,
  PerBookingBarPoint,
  PropertyAnalyticsSnapshot,
} from "@/lib/property-booking-analytics"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const GREEN = {
  primary: "#166534",
  mid: "#15803d",
  light: "#22c55e",
  pale: "#bbf7d0",
  muted: "#86efac",
}

/** Brand-aligned colours for OTAs / direct (donut + legend). */
function channelDonutColor(label: string, index: number): string {
  const n = label.toLowerCase()
  if (n.includes("airbnb")) return "#FF5A5F"
  if (n.includes("booking")) return "#003580"
  if (n.includes("uplisting") || n.includes("direct")) return "#166534"
  if (n.includes("vrbo") || n.includes("homeaway")) return "#2B6CB0"
  if (n.includes("expedia")) return "#FFC72C"
  if (n.includes("tripadvisor")) return "#00AF87"
  const FALLBACK = ["#0d9488", "#7c3aed", "#c2410c", "#64748b", "#78716c"]
  return FALLBACK[index % FALLBACK.length]
}

function formatZar(n: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n)
}

function compactAxisZar(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(Math.round(v))
}

type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>
  label?: string
}

function MoneyTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-semibold text-slate-900">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2 text-slate-700">
            <span className="size-2 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="capitalize">{p.name ?? p.dataKey}:</span>
            <span className="font-medium tabular-nums">{formatZar(Number(p.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PieTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const v = Number(p?.value ?? 0)
  const name = String(p?.name ?? "")
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="tabular-nums text-slate-700">{formatZar(v)}</p>
    </div>
  )
}

function ShareMeter({
  label,
  value,
  total,
  color,
  basisLabel = "gross",
}: {
  label: string
  value: number
  total: number
  color: string
  /** Denominator label shown after the percentage (e.g. gross revenue, total payout). */
  basisLabel?: string
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-500">
          {pct.toFixed(0)}% of {basisLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

type PropertyAnalyticsVisualsProps = {
  snapshot: PropertyAnalyticsSnapshot
  monthlySeries: AnalyticsMonthPoint[]
  channelSlices: ChannelGrossSlice[]
  perBookingBars: PerBookingBarPoint[]
  useMonthlyTrend: boolean
}

export function PropertyAnalyticsVisuals({
  snapshot,
  monthlySeries,
  channelSlices,
  perBookingBars,
  useMonthlyTrend,
}: PropertyAnalyticsVisualsProps) {
  const gross = snapshot.grossRevenue
  const hasMoney = gross > 0

  return (
    <div className="space-y-6">
      {hasMoney ? (
        <div className="grid gap-4 rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm sm:grid-cols-3">
          <ShareMeter label="Total payout" value={snapshot.totalPayout} total={gross} color={GREEN.primary} />
          <ShareMeter label="Commission" value={snapshot.commission} total={gross} color={GREEN.mid} />
          <ShareMeter
            label="Management fees"
            value={snapshot.managementFees}
            total={snapshot.totalPayout}
            color={GREEN.light}
            basisLabel="total payout"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">
            {useMonthlyTrend ? "Revenue by check-in month" : "Revenue by stay"}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            {useMonthlyTrend
              ? "Gross revenue and payout aggregated per calendar month"
              : "Gross revenue per booking in this filter (top stays)"}
          </p>
          <div className="mt-3 h-[260px] w-full min-w-0">
            {useMonthlyTrend && monthlySeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={compactAxisZar}
                  />
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 8 }} />
                  <Bar dataKey="gross" name="Gross revenue" fill={GREEN.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="payout" name="Total payout" fill={GREEN.muted} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : !useMonthlyTrend && perBookingBars.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={perBookingBars}
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickFormatter={compactAxisZar}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={92}
                    tick={{ fontSize: 10, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 8 }} />
                  <Bar dataKey="gross" name="Gross revenue" fill={GREEN.primary} radius={[0, 4, 4, 0]} maxBarSize={22} />
                  <Bar dataKey="payout" name="Total payout" fill={GREEN.muted} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Nothing to chart for this period.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Gross revenue by channel</h4>
          <p className="mt-0.5 text-xs text-slate-500">From CSV channel / booking source fields</p>
          <div className="mt-3 h-[260px] w-full min-w-0">
            {channelSlices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelSlices}
                    dataKey="gross"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {channelSlices.map((entry, i) => (
                      <Cell
                        key={`${entry.name}-${i}`}
                        fill={channelDonutColor(entry.name, i)}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No channel gross in this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {monthlySeries.length > 1 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Activity trend</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Guest nights (bars) and booking count (line) by check-in month
          </p>
          <div className="mt-3 h-[200px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlySeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis
                  yAxisId="nights"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="bookings"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={36}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0]?.payload as AnalyticsMonthPoint | undefined
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-semibold text-slate-900">{label}</p>
                        <p className="text-slate-700">Bookings: {row?.bookingCount ?? 0}</p>
                        <p className="text-slate-700">Nights: {row?.nights ?? 0}</p>
                      </div>
                    )
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 8 }} />
                <Bar
                  yAxisId="nights"
                  dataKey="nights"
                  name="Guest nights"
                  fill={GREEN.pale}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Line
                  yAxisId="bookings"
                  type="monotone"
                  dataKey="bookingCount"
                  name="Bookings"
                  stroke={GREEN.primary}
                  strokeWidth={2}
                  dot={{ fill: GREEN.primary, r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
