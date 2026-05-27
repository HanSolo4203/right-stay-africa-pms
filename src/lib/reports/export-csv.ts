import type { ReportsSummaryResponse } from "@/lib/reports/types"

function csvCell(cell: string | number): string {
  const s = String(cell)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportReportsToCsv(data: ReportsSummaryResponse) {
  const summaryRows: Array<Array<string | number>> = [
    ["Right Stay Africa - Financial Report"],
    [`Period: ${data.period.label}`],
    [`Generated: ${new Date().toLocaleDateString("en-ZA")}`],
    [],
    ["BUSINESS SUMMARY"],
    ["Metric", "Value"],
    ["Total Revenue Managed", data.business.totalRevenueManaged],
    ["Total Management Fees", data.business.totalManagementFees],
    ["Total Owner Payouts", data.business.totalOwnerPayouts],
    ["Total Bookings", data.portfolio.totalBookings],
    ["Total Nights", data.portfolio.totalNights],
    ["Portfolio Occupancy", `${data.portfolio.occupancyRate}%`],
    [],
    ["PROPERTY BREAKDOWN"],
    [
      "Property",
      "Owner",
      "Bookings",
      "Nights",
      "Occupancy%",
      "Gross Revenue",
      "Mgmt Fees",
      "Owner Payout",
    ],
    ...data.propertyBreakdown.map((p) => [
      p.propertyName,
      p.ownerName ?? "",
      p.bookings,
      p.nights,
      `${p.occupancyRate}%`,
      p.grossRevenue,
      p.managementFees,
      p.ownerPayout,
    ]),
    [],
    ["PLATFORM BREAKDOWN"],
    ["Platform", "Bookings", "Revenue", "Mgmt Fees", "Avg/Night"],
    ...data.platformBreakdown.map((p) => [
      p.platform,
      p.bookings,
      p.revenue,
      p.managementFees,
      p.averageNightlyRate,
    ]),
  ]

  const csvContent = summaryRows.map((row) => row.map(csvCell).join(",")).join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `rsa-report-${data.period.label.replace(/\s/g, "-")}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
