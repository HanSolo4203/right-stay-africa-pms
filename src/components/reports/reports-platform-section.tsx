"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPlatformColor } from "@/lib/calendar/platform-colors"
import { formatMoneyZar } from "@/lib/owner-statement/format-money"
import type { ReportsSummaryResponse } from "@/lib/reports/types"

export function ReportsPlatformSection({ data }: { data: ReportsSummaryResponse }) {
  const { platformBreakdown } = data

  const totals = platformBreakdown.reduce(
    (acc, row) => ({
      bookings: acc.bookings + row.bookings,
      nights: acc.nights + row.nights,
      revenue: acc.revenue + row.revenue,
      managementFees: acc.managementFees + row.managementFees,
    }),
    { bookings: 0, nights: 0, revenue: 0, managementFees: 0 }
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Revenue by platform</h3>
      {platformBreakdown.length > 0 ? (
        <>
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformBreakdown} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `R${(Number(v) / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="platform"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(v: number) => `R ${v.toLocaleString("en-ZA")}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {platformBreakdown.map((entry) => (
                    <Cell
                      key={entry.platform}
                      fill={getPlatformColor(entry.platform).bg}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-600">Platform</TableHead>
                  <TableHead className="text-right text-slate-600">Bookings</TableHead>
                  <TableHead className="text-right text-slate-600">Nights</TableHead>
                  <TableHead className="text-right text-slate-600">Revenue</TableHead>
                  <TableHead className="text-right text-slate-600">Mgmt fees</TableHead>
                  <TableHead className="text-right text-slate-600">Avg/night</TableHead>
                  <TableHead className="text-right text-slate-600">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformBreakdown.map((row) => (
                  <TableRow key={row.platform}>
                    <TableCell className="font-medium text-slate-900">{row.platform}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.bookings}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.nights}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyZar(row.revenue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">
                      {formatMoneyZar(row.managementFees)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoneyZar(row.averageNightlyRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {row.revenueShare.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-slate-50 font-semibold hover:bg-slate-50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.bookings}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.nights}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoneyZar(totals.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">
                    {formatMoneyZar(totals.managementFees)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">No platform revenue in period.</p>
      )}
    </section>
  )
}
