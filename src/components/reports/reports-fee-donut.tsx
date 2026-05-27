"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ReportsSummaryResponse } from "@/lib/reports/types"

const FEE_COLORS = {
  management: "#1a5c35",
  processing: "#4ade80",
  channel: "#94a3b8",
}

export function ReportsFeeDonut({ data }: { data: ReportsSummaryResponse }) {
  const { feeBreakdown, business } = data
  const gross = business.totalRevenueManaged

  const chartData = [
    { name: "Management fees", value: feeBreakdown.managementFees, key: "management" },
    { name: "Processing fees", value: feeBreakdown.processingFees, key: "processing" },
    { name: "Channel commissions", value: feeBreakdown.channelFees, key: "channel" },
  ].filter((d) => d.value > 0)

  const pctOfGross = (amount: number) =>
    gross > 0 ? `${((amount / gross) * 100).toFixed(1)}% of gross` : "—"

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Fee distribution</h3>
      <p className="mt-0.5 text-sm text-slate-500">How management fees break down</p>

      {chartData.length > 0 ? (
        <>
          <div className="mx-auto mt-4 h-[200px] max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={FEE_COLORS[entry.key as keyof typeof FEE_COLORS]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatMoneyZar(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-slate-600">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: FEE_COLORS.management }}
                />
                Management fees
              </dt>
              <dd className="text-right">
                <span className="font-medium tabular-nums text-slate-900">
                  {formatMoneyZar(feeBreakdown.managementFees)}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  {pctOfGross(feeBreakdown.managementFees)}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-slate-600">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: FEE_COLORS.processing }}
                />
                Processing fees
              </dt>
              <dd className="text-right">
                <span className="font-medium tabular-nums text-slate-900">
                  {formatMoneyZar(feeBreakdown.processingFees)}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  {pctOfGross(feeBreakdown.processingFees)}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-slate-600">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: FEE_COLORS.channel }}
                />
                Channel fees
              </dt>
              <dd className="text-right">
                <span className="font-medium tabular-nums text-slate-900">
                  {formatMoneyZar(feeBreakdown.channelFees)}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  {pctOfGross(feeBreakdown.channelFees)}
                </span>
              </dd>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <div className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                <span>Your total earned</span>
                <span className="tabular-nums text-emerald-700">
                  {formatMoneyZar(feeBreakdown.totalEarned)}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {pctOfGross(feeBreakdown.totalEarned)}
                  </span>
                </span>
              </div>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">No fee data for this period.</p>
      )}
    </section>
  )
}
