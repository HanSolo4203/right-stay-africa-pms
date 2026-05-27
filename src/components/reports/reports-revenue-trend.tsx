"use client"

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ReportsSummaryResponse } from "@/lib/reports/types"

export function ReportsRevenueTrend({ data }: { data: ReportsSummaryResponse }) {
  const { monthlyTrend } = data

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Revenue trend</h3>
      <p className="mt-0.5 text-sm text-slate-500">
        Last 12 months — management fees vs gross revenue managed
      </p>
      <div className="mt-4 h-[280px]">
        {monthlyTrend.some((m) => m.revenueManaged > 0 || m.managementFees > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrend} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R${(Number(v) / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "Occupancy") return [`${value}%`, name]
                  return [`R ${Number(value).toLocaleString("en-ZA")}`, name]
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="left"
                dataKey="revenueManaged"
                name="Revenue Managed"
                fill="#93C5FD"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="managementFees"
                name="Mgmt Fees (RSA)"
                fill="#1a5c35"
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="occupancyRate"
                name="Occupancy"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ r: 3, fill: "#F59E0B" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No revenue in the last 12 months.
          </div>
        )}
      </div>
    </section>
  )
}
